(function () {
  "use strict";

  /* ── Modales ───────────────────────────── */
  function abrirModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove("oculto");
  }

  function cerrarModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add("oculto");
  }

  document.addEventListener("click", function (e) {
    if (e.target.hasAttribute("data-cierra-modal")) {
      const m = e.target.closest(".modal");
      if (m) cerrarModal(m.id);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const m = document.querySelector(".modal:not(.oculto)");
      if (m) cerrarModal(m.id);
    }
  });

  /* ── Toast ─────────────────────────────── */
  let toastTimer = null;

  function mostrarToast(mensaje, tipo) {
    const t = document.getElementById("toast");
    t.textContent = mensaje;
    t.className = "toast toast-" + (tipo || "ok");
    t.classList.remove("oculto");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add("oculto"), 3000);
  }

  /* ── Helpers fecha UI ──────────────────── */
  const MESES = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];
  const DIAS_SEMANA = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

  function nombreMes(indice) { return MESES[indice]; }

  function formatearFechaLarga(fechaStr) {
    const [a, m, d] = fechaStr.split("-");
    const dow = DIAS_SEMANA[new Date(fechaStr + "T12:00:00").getDay()];
    return `${dow}, ${parseInt(d)} de ${MESES[parseInt(m) - 1]} de ${a}`;
  }

  /* ── Escape HTML (datos del Excel insertados en innerHTML) ── */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  /* ── Placeholders (sobreescritos por otros modulos) ── */
  async function refrescarCalendario() {}
  function abrirDia() {}

  window.NRDE_UI = {
    abrirModal,
    cerrarModal,
    mostrarToast,
    nombreMes,
    formatearFechaLarga,
    escapeHtml,
    refrescarCalendario,
    abrirDia,
    MESES,
    DIAS_SEMANA
  };

})();
