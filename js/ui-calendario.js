(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  const LIMITE_CHIPS_POR_DIA = 3;

  const hoyDate  = new Date();
  let mesActual  = hoyDate.getMonth();   // 0-based
  let anyoActual = hoyDate.getFullYear();

  /* ── Renderizar mes completo ───────────── */
  async function renderizarMes() {
    const mes  = mesActual;
    const anyo = anyoActual;

    $("mes-titulo").textContent = NRDE_UI.nombreMes(mes) + " " + anyo;

    const hechos = await NRDE.getHechosMes(anyo, mes + 1);
    const mapaPorFecha = {};
    hechos.forEach(h => {
      (mapaPorFecha[h.fecha] = mapaPorFecha[h.fecha] || []).push(h);
    });

    const fechaHoyStr = NRDE.fechaHoy();
    const grid = $("calendario-grid");
    grid.innerHTML = "";

    // Primer dia de la semana del mes (0=Dom ... 6=Sab)
    const primerDiaSemana = new Date(anyo, mes, 1).getDay();
    const diasEnMes       = new Date(anyo, mes + 1, 0).getDate();
    const diasMesAnterior = new Date(anyo, mes, 0).getDate();

    const celdas = [];

    // Dias sobrantes del mes anterior (relleno visual, no clicables)
    for (let i = 0; i < primerDiaSemana; i++) {
      celdas.push({ dia: diasMesAnterior - primerDiaSemana + i + 1, fueraDeMes: true });
    }

    // Dias del mes actual
    for (let d = 1; d <= diasEnMes; d++) {
      const fechaStr = `${anyo}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      celdas.push({ dia: d, fechaStr, fueraDeMes: false });
    }

    // Completar la ultima semana con dias del mes siguiente
    let diaSiguiente = 1;
    while (celdas.length % 7 !== 0) {
      celdas.push({ dia: diaSiguiente++, fueraDeMes: true });
    }

    celdas.forEach(c => {
      const div = document.createElement("div");

      if (c.fueraDeMes) {
        div.className = "dia-celda fuera-de-mes";
        div.innerHTML = `<span class="dia-celda-num">${c.dia}</span>`;
        grid.appendChild(div);
        return;
      }

      const hechosDelDia = mapaPorFecha[c.fechaStr] || [];
      const esHoy = c.fechaStr === fechaHoyStr;

      div.className = "dia-celda" + (esHoy ? " es-hoy" : "");
      div.dataset.fecha = c.fechaStr;
      div.setAttribute("role", "button");
      div.setAttribute("tabindex", "0");
      div.setAttribute("aria-label", `Día ${c.dia}, ${hechosDelDia.length} hechos`);

      const visibles  = hechosDelDia.slice(0, LIMITE_CHIPS_POR_DIA);
      const restantes = hechosDelDia.length - visibles.length;

      const chipsHtml = visibles.map(h => {
        const esMacro = h.empresa === "MACRO";
        return `<span class="hecho-chip${esMacro ? " es-macro" : ""}">
          <span class="hecho-dot ${h.categoria}"></span>${NRDE_UI.escapeHtml(h.empresa)}
        </span>`;
      }).join("");

      const masHtml = restantes > 0
        ? `<span class="hecho-mas">+${restantes} más</span>`
        : "";

      div.innerHTML = `
        <span class="dia-celda-num">${c.dia}</span>
        <div class="dia-celda-hechos">${chipsHtml}${masHtml}</div>
      `;

      div.addEventListener("click", () => NRDE_UI.abrirDia(c.fechaStr));
      div.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          NRDE_UI.abrirDia(c.fechaStr);
        }
      });

      grid.appendChild(div);
    });

    // Aviso de "sin datos" si no hay nada sincronizado nunca
    const aviso = $("aviso-vacio");
    if (!NRDE.getPbUrl()) {
      aviso.textContent = "Sin servidor configurado. Pulsa el punto del header para conectar con PocketBase.";
      aviso.classList.remove("oculto");
    } else if (hechos.length === 0 && !(await hayAlgunDatoGuardado())) {
      aviso.textContent = "Sin datos todavía. Pulsa Actualizar para sincronizar.";
      aviso.classList.remove("oculto");
    } else {
      aviso.classList.add("oculto");
    }
  }

  async function hayAlgunDatoGuardado() {
    return !!(await NRDE.getUltimaSync());
  }

  /* ── Navegacion ────────────────────────── */
  function irMesAnterior() {
    if (mesActual === 0) { mesActual = 11; anyoActual--; }
    else mesActual--;
    renderizarMes();
  }

  function irMesSiguiente() {
    if (mesActual === 11) { mesActual = 0; anyoActual++; }
    else mesActual++;
    renderizarMes();
  }

  function irAHoy() {
    mesActual  = hoyDate.getMonth();
    anyoActual = hoyDate.getFullYear();
    renderizarMes();
  }

  /* ── Init ──────────────────────────────── */
  document.addEventListener("DOMContentLoaded", function () {
    $("btn-mes-ant").addEventListener("click", irMesAnterior);
    $("btn-mes-sig").addEventListener("click", irMesSiguiente);
    $("btn-hoy").addEventListener("click", irAHoy);
    renderizarMes();
  });

  window.NRDE_UI = window.NRDE_UI || {};
  window.NRDE_UI.refrescarCalendario = renderizarMes;

})();
