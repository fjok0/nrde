(function () {
  "use strict";

  /* ══════════════════════════════════════════
     CAPA LOCAL — Dexie (IndexedDB)
     Cache de solo lectura de la coleccion "hechos"
     de PocketBase. La app nunca escribe hacia
     PocketBase: el Excel es la unica fuente de verdad.
  ══════════════════════════════════════════ */
  const db = new Dexie("nrde");

  db.version(1).stores({
    hechos: "id, fecha, empresa"
  });

  /* ══════════════════════════════════════════
     CONFIG POCKETBASE
  ══════════════════════════════════════════ */
  let pbUrl       = localStorage.getItem("nrde_pb_url") || "";
  let pbConnected = false;

  function setPbUrl(url) {
    pbUrl = url.replace(/\/$/, "");
    localStorage.setItem("nrde_pb_url", pbUrl);
  }

  async function testPbConnection() {
    if (!pbUrl) return false;
    try {
      const res = await fetch(pbUrl + "/api/health", {
        signal: AbortSignal.timeout(3000)
      });
      return res.ok;
    } catch { return false; }
  }

  /* ══════════════════════════════════════════
     POCKETBASE REST — solo lectura
  ══════════════════════════════════════════ */
  async function pbGetAll() {
    const items = [];
    let page = 1;
    try {
      for (;;) {
        const res = await fetch(
          `${pbUrl}/api/collections/hechos/records?page=${page}&perPage=500&sort=fecha`,
          { signal: AbortSignal.timeout(8000) }
        );
        if (!res.ok) return null;
        const data = await res.json();
        items.push(...(data.items || []));
        if (page >= data.totalPages) break;
        page++;
      }
      return items;
    } catch {
      return null;
    }
  }

  /* ══════════════════════════════════════════
     SINCRONIZACION
     Full replace: se descarga todo de PocketBase
     y se reemplaza el cache local por completo.
     No hay merge ni resolucion de conflictos porque
     la app nunca escribe: PocketBase manda siempre.
  ══════════════════════════════════════════ */
  async function sincronizar() {
    if (!pbUrl) return false;
    pbConnected = await testPbConnection();
    if (!pbConnected) return false;

    const remotos = await pbGetAll();
    if (remotos === null) {
      pbConnected = false;
      return false;
    }

    await db.transaction("rw", db.hechos, async () => {
      await db.hechos.clear();
      if (remotos.length) {
        await db.hechos.bulkAdd(remotos.map(r => ({
          id:        r.id,
          fecha:     r.fecha,
          empresa:   r.empresa,
          texto:     r.texto,
          etiqueta:  r.etiqueta,
          categoria: r.categoria
        })));
      }
    });

    localStorage.setItem("nrde_ultima_sync", new Date().toISOString());
    return true;
  }

  /* ══════════════════════════════════════════
     LECTURA PUBLICA
  ══════════════════════════════════════════ */
  async function getHechosMes(anyo, mes) {
    const mm    = String(mes).padStart(2, "0");
    const desde = `${anyo}-${mm}-01`;
    const hasta = `${anyo}-${mm}-31`;
    return await db.hechos
      .where("fecha").between(desde, hasta, true, true)
      .toArray();
  }

  async function getHechosDia(fecha) {
    return await db.hechos.where("fecha").equals(fecha).toArray();
  }

  function getUltimaSync() {
    return localStorage.getItem("nrde_ultima_sync") || null;
  }

  /* ══════════════════════════════════════════
     HELPERS DE FECHA
  ══════════════════════════════════════════ */
  function fechaHoy() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  /* ══════════════════════════════════════════
     NAMESPACE PUBLICO
  ══════════════════════════════════════════ */
  window.NRDE = {
    // Lectura
    getHechosMes,
    getHechosDia,
    getUltimaSync,
    // Sync
    sincronizar,
    testPbConnection,
    setPbUrl,
    getPbUrl:       () => pbUrl,
    isPbConnected:  () => pbConnected,
    setPbConnected: (v) => { pbConnected = v; },
    // Fechas
    fechaHoy
  };

})();
