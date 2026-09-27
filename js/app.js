(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  /* ── Indicador de sync ─────────────────── */
  function actualizarIndicadorSync() {
    const dot = $("sync-dot");
    if (!dot) return;

    if (!NRDE.getPbUrl()) {
      dot.className = "sync-dot";
      dot.title     = "Sincronización no configurada — pulsa para configurar";
    } else if (NRDE.isPbConnected()) {
      dot.className = "sync-dot conectado";
      dot.title     = "Conectado y sincronizado";
    } else {
      dot.className = "sync-dot desconectado";
      dot.title     = "Sin conexión al servidor (modo offline)";
    }
  }

  /* ── Actualizar (sync manual) ──────────── */
  async function actualizar(mostrarFeedback) {
    const dot = $("sync-dot");
    if (dot) dot.className = "sync-dot sincronizando";

    const ok = await NRDE.sincronizar();
    actualizarIndicadorSync();
    await NRDE_UI.refrescarCalendario();

    if (mostrarFeedback) {
      if (ok) NRDE_UI.mostrarToast("Actualizado ✓", "ok");
      else NRDE_UI.mostrarToast("No se pudo conectar con PocketBase", "error");
    }
    return ok;
  }

  /* ── Init ──────────────────────────────── */
  async function init() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () =>
        navigator.serviceWorker.register("./service-worker.js")
      );
    }

    await actualizar(false);
  }

  document.addEventListener("DOMContentLoaded", function () {
    init();

    $("btn-actualizar").addEventListener("click", () => actualizar(true));

    $("sync-estado").addEventListener("click", function () {
      $("sync-url").value = NRDE.getPbUrl();
      $("sync-resultado").className = "sync-resultado oculto";
      NRDE_UI.abrirModal("modal-sync");
    });

    $("btn-guardar-sync").addEventListener("click", async function () {
      const url = $("sync-url").value.trim();
      if (!url) {
        NRDE_UI.mostrarToast("Introduce una URL", "error");
        return;
      }

      const res = $("sync-resultado");
      res.textContent = "Probando conexión...";
      res.className   = "sync-resultado";

      NRDE.setPbUrl(url);
      const ok = await NRDE.testPbConnection();

      if (ok) {
        NRDE.setPbConnected(true);
        res.textContent = "✓ Conexión correcta";
        res.className   = "sync-resultado ok";

        await actualizar(false);
        NRDE_UI.cerrarModal("modal-sync");
        NRDE_UI.mostrarToast("Sincronizado ✓", "ok");
      } else {
        NRDE.setPbConnected(false);
        res.textContent = "✗ No se pudo conectar. Verifica que PocketBase esté corriendo y que la URL sea correcta.";
        res.className   = "sync-resultado error";
        actualizarIndicadorSync();
      }
    });
  });

  window.NRDE_APP = { actualizar, actualizarIndicadorSync };

})();
