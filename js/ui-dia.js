(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  const ETIQUETAS_LEGIBLES = {
    CONF: "Conferencia",
    EST:  "Resultados",
    PRE:  "Resultados",
    GUIA: "Guía / hito",
    OTRO: "Sin clasificar"
  };

  async function abrirDia(fechaStr) {
    const hechos = await NRDE.getHechosDia(fechaStr);
    hechos.sort((a, b) => a.empresa.localeCompare(b.empresa));

    $("dia-header-titulo").textContent = NRDE_UI.formatearFechaLarga(fechaStr);

    const lista = $("dia-detalle-lista");
    lista.innerHTML = "";

    if (hechos.length === 0) {
      lista.innerHTML = `<p class="dia-detalle-vacio">Sin hechos registrados este día.</p>`;
    } else {
      hechos.forEach(h => {
        const esMacro = h.empresa === "MACRO";
        const etiquetaTexto = ETIQUETAS_LEGIBLES[h.etiqueta] || h.etiqueta;

        const card = document.createElement("div");
        card.className = `hecho-card ${h.categoria}`;
        card.innerHTML = `
          <div class="hecho-card-cabecera">
            <span class="hecho-card-empresa${esMacro ? " es-macro" : ""}">${NRDE_UI.escapeHtml(h.empresa)}</span>
            <span class="hecho-card-etiqueta ${h.categoria}">${NRDE_UI.escapeHtml(etiquetaTexto)}</span>
          </div>
          <p class="hecho-card-texto">${NRDE_UI.escapeHtml(h.texto)}</p>
        `;
        lista.appendChild(card);
      });
    }

    $("pantalla-dia").classList.remove("oculto");
  }

  function cerrarDia() {
    $("pantalla-dia").classList.add("oculto");
  }

  document.addEventListener("DOMContentLoaded", function () {
    $("btn-volver-dia").addEventListener("click", cerrarDia);
  });

  window.NRDE_UI = window.NRDE_UI || {};
  window.NRDE_UI.abrirDia = abrirDia;

})();
