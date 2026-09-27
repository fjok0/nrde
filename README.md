# NRDE — Noticias Relevantes de Empresas

PWA de solo lectura para visualizar en el móvil, en formato calendario, los hechos
relevantes de empresas que llevas en tu Excel. Mismo patrón de arquitectura que
MITENSION/MICORSE: HTML+CSS+JS vanilla, IndexedDB (Dexie) como cache local,
PocketBase como servidor de sincronización WiFi en casa, GitHub Pages para el
despliegue.

## Flujo de datos

```
NRDE.xlsx (lo editas tú)
   │  node scripts/importar-excel.js   (full replace)
   ▼
PocketBase — colección "hechos"   (servidor en tu PC, puerto 8090)
   │  sync manual (botón Actualizar en la app)
   ▼
App móvil NRDE (calendario, solo lectura)
```

La app **nunca escribe** en PocketBase. El Excel es la única fuente de verdad:
cada vez que ejecutas el importador se borra toda la colección `hechos` y se
recrea desde cero a partir del Excel.

## Esquema del Excel

Fila 1 = cabeceras. Desde la fila 2:

| Columna | Campo   | Contenido |
|---|---|---|
| A | fecha   | `DD/MM/YYYY` |
| B | empresa | Nombre completo, o `MACRO` para noticias macroeconómicas |
| C | texto   | Debe empezar con una etiqueta entre corchetes: `[CONF]`, `[EST]`, `[PRE]` o `[GUIA]` |

La etiqueta determina el color del punto en el calendario:

| Etiqueta | Categoría | Color |
|---|---|---|
| `CONF` | Conferencia / evento menor | Verde |
| `EST`, `PRE` | Resultados | Rojo |
| `GUIA` | Guía de resultados / hito | Amarillo |
| (sin etiqueta reconocida) | Sin clasificar | Gris |

## Puesta en marcha (una sola vez)

### 1. Arrancar PocketBase

Este proyecto reutiliza el mismo servidor PocketBase que ya tienes corriendo
para MICORSE, en `C:\POCKETBASE`. La colección `hechos` se crea sola la
primera vez que arrancas el servidor (migración en `pb_migrations`).

```bash
cd C:\POCKETBASE
pocketbase.exe serve --http=0.0.0.0:8090
```

### 2. Crear (o reutilizar) un superusuario

El script de importación necesita autenticarse como superusuario de
PocketBase para poder borrar/recrear registros (la app móvil solo necesita
lectura pública, no requiere login).

- Abre `http://localhost:8090/_/` en el navegador del PC.
- Si ya tienes un superusuario (el que creaste para MICORSE), puedes
  reutilizarlo, o crear uno nuevo dedicado en *Settings > Admins/Superusers*.

### 3. Configurar el script de importación

```bash
cd C:\TODO\TODO_INFORMATICA\PROYECTOS\NRDE\scripts
copy config.example.json config.local.json
```

Edita `config.local.json` con la URL de PocketBase y el email/contraseña del
superusuario. Este archivo está en `.gitignore`, nunca se sube al repo.

Instala las dependencias del script (solo una vez):

```bash
npm install
```

### 4. Importar el Excel

Puedes ejecutarlo manualmente:

```bash
node importar-excel.js
```

O usar el acceso directo en el escritorio: **`NRDE_Importar.bat`**. El
`.bat` es solo un lanzador fino — la lógica real vive en
`scripts/importar-excel.js`, así que puedes copiar esas mismas líneas en
otro `.bat` que ya uses para lanzar tus apps.

Cada vez que edites el Excel (añadas, borres o reordenes hechos), vuelve a
ejecutar el importador para reflejar los cambios en PocketBase.

### 5. Conectar la app móvil

En el móvil, abre la app y pulsa el punto de color del header. Introduce
`http://<IP-de-tu-PC>:8090` (la IP local, con `ipconfig`) y guarda. El botón
**Actualizar** de la app descarga los datos de PocketBase (requiere que el
servidor esté corriendo y el móvil esté en la misma WiFi).

## Mixed Content (HTTPS vs HTTP local)

Igual que en MICORSE: si abres la app desde GitHub Pages (HTTPS), el móvil
bloqueará las llamadas HTTP a PocketBase (Mixed Content). Por eso una copia
de la app vive también en `C:\POCKETBASE\pb_public\nrde\` y se sirve en
`http://<IP-de-tu-PC>:8090/nrde/` — ábrela desde ahí cuando quieras
sincronizar en casa. GitHub Pages sigue sirviendo para acceso externo sin
sync. Si actualizas la app, recuerda volver a copiar los archivos a
`pb_public/nrde/` (o usar el mismo script/paso que ya uses para MICORSE).

## Despliegue (GitHub Pages)

Igual que MICORSE — repo en GitHub, Settings > Pages > branch `main`,
carpeta `/ (root)`. Instala la PWA desde el navegador del móvil (Añadir a
pantalla de inicio). El empaquetado como `.apk` (Capacitor) queda pendiente
para más adelante.

## Estructura

```
NRDE/
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── NRDE.xlsx                  <- tu Excel (no se sube al repo)
├── css/styles.css
├── js/
│   ├── db.js                  <- Dexie + lectura PocketBase + sync
│   ├── app.js                 <- arranque, indicador sync, botón Actualizar
│   ├── ui-comunes.js          <- toast, modales, helpers de fecha
│   ├── ui-calendario.js       <- vista mensual (grid)
│   ├── ui-dia.js              <- vista detalle del día
│   └── lib/dexie.min.js
├── assets/                    <- logo + iconos PWA
└── scripts/
    ├── importar-excel.js      <- Excel -> PocketBase (full replace)
    ├── config.example.json
    └── config.local.json      <- tus credenciales (no se sube al repo)
```
