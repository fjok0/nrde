"use strict";

/*
 * NRDE — Importador Excel -> PocketBase
 *
 * Lee NRDE.xlsx (carpeta del proyecto, un nivel por encima de scripts/)
 * y vuelca su contenido en la coleccion "hechos" de PocketBase.
 *
 * Estrategia: full replace. El Excel es la unica fuente de verdad para
 * esta coleccion (la app movil es de solo lectura), asi que en cada
 * ejecucion se borran todos los registros existentes y se recrean desde
 * cero. No se intenta diff/upsert.
 *
 * Uso: node importar-excel.js
 * Requiere scripts/config.local.json (copiar de config.example.json).
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const EXCEL_PATH = path.join(__dirname, "..", "NRDE.xlsx");
const CONFIG_PATH = path.join(__dirname, "config.local.json");

// CONF = conferencia (verde), EST/PRE = resultados (rojo),
// GUIA = guia de resultados/hitos (amarillo). Cualquier otra
// etiqueta, o ausencia de etiqueta, cae en gris (sin clasificar).
const MAPA_CATEGORIA = {
  CONF: "verde",
  EST: "rojo",
  PRE: "rojo",
  GUIA: "amarillo"
};

function cargarConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(
      `No se encuentra ${CONFIG_PATH}\n` +
      "Copia config.example.json a config.local.json y rellena tus credenciales de superusuario de PocketBase."
    );
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function parsearFecha(valor) {
  if (valor instanceof Date) {
    const y = valor.getFullYear();
    const m = String(valor.getMonth() + 1).padStart(2, "0");
    const d = String(valor.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const texto = String(valor).trim();
  // Formato esperado: DD/MM/YYYY
  const m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function clasificarTexto(textoOriginal) {
  const texto = String(textoOriginal || "").trim();
  const m = texto.match(/^\[([A-Za-z0-9]+)\]\s*/);
  if (!m) {
    return { etiqueta: "OTRO", categoria: "gris", texto };
  }
  const etiqueta = m[1].toUpperCase();
  const categoria = MAPA_CATEGORIA[etiqueta] || "gris";
  const resto = texto.slice(m[0].length).trim();
  return { etiqueta, categoria, texto: resto };
}

function leerExcel() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`No se encuentra el Excel en ${EXCEL_PATH}`);
    process.exit(1);
  }
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

  const registros = [];
  const errores = [];

  for (let i = 1; i < filas.length; i++) {
    const fila = filas[i];
    if (!fila || fila.length === 0) continue;
    const [fechaRaw, empresaRaw, textoRaw] = fila;
    if (!fechaRaw && !empresaRaw && !textoRaw) continue; // fila vacia

    const fecha = parsearFecha(fechaRaw);
    const empresa = String(empresaRaw || "").trim();
    if (!fecha || !empresa || !textoRaw) {
      errores.push({ fila: i + 1, fechaRaw, empresaRaw, textoRaw });
      continue;
    }

    const { etiqueta, categoria, texto } = clasificarTexto(textoRaw);
    registros.push({ fecha, empresa, texto, etiqueta, categoria });
  }

  return { registros, errores };
}

async function autenticar(pbUrl, email, password) {
  const res = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: email, password })
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Autenticacion fallida (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.token;
}

async function obtenerTodos(pbUrl, token) {
  const items = [];
  let page = 1;
  for (;;) {
    const res = await fetch(
      `${pbUrl}/api/collections/hechos/records?page=${page}&perPage=500`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`No se pudieron listar registros (${res.status})`);
    const data = await res.json();
    items.push(...data.items);
    if (page >= data.totalPages) break;
    page++;
  }
  return items;
}

async function borrarTodos(pbUrl, token, items) {
  for (const item of items) {
    const res = await fetch(`${pbUrl}/api/collections/hechos/records/${item.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(`No se pudo borrar el registro ${item.id} (${res.status})`);
  }
}

async function crearRegistros(pbUrl, token, registros) {
  let ok = 0;
  for (const registro of registros) {
    const res = await fetch(`${pbUrl}/api/collections/hechos/records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(registro)
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`  ! Error creando registro ${JSON.stringify(registro)}: ${res.status} ${body}`);
      continue;
    }
    ok++;
  }
  return ok;
}

async function main() {
  const config = cargarConfig();
  console.log(`Leyendo ${EXCEL_PATH}...`);
  const { registros, errores } = leerExcel();
  console.log(`  ${registros.length} filas validas, ${errores.length} filas con datos incompletos.`);
  if (errores.length) {
    console.log("  Filas ignoradas:", errores.map(e => e.fila).join(", "));
  }

  const porCategoria = {};
  const sinEtiqueta = [];
  registros.forEach(r => {
    porCategoria[r.categoria] = (porCategoria[r.categoria] || 0) + 1;
    if (r.etiqueta === "OTRO") sinEtiqueta.push(r);
  });
  console.log("  Por categoria:", porCategoria);
  if (sinEtiqueta.length) {
    console.log(`  Aviso: ${sinEtiqueta.length} hechos sin etiqueta reconocida (categoria gris).`);
  }

  console.log("Autenticando en PocketBase...");
  const token = await autenticar(config.pbUrl, config.adminEmail, config.adminPassword);

  console.log("Borrando registros existentes en la coleccion 'hechos'...");
  const existentes = await obtenerTodos(config.pbUrl, token);
  await borrarTodos(config.pbUrl, token, existentes);
  console.log(`  ${existentes.length} registros borrados.`);

  console.log("Creando registros desde el Excel...");
  const creados = await crearRegistros(config.pbUrl, token, registros);
  console.log(`  ${creados}/${registros.length} registros creados.`);

  console.log("Importacion completada.");
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
