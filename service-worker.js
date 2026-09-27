const CACHE_NAME = "nrde-v1";

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./assets/logo.svg",
  "./js/lib/dexie.min.js",
  "./js/db.js",
  "./js/app.js",
  "./js/ui-comunes.js",
  "./js/ui-calendario.js",
  "./js/ui-dia.js"
];

self.addEventListener("install", e => e.waitUntil(
  caches.open(CACHE_NAME)
    .then(c => c.addAll(PRECACHE))
    .then(() => self.skipWaiting())
));

self.addEventListener("activate", e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
    .then(() => self.clients.claim())
));

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);

  // No cachear peticiones a PocketBase (siempre van a la red)
  if (url.pathname.startsWith("/api/")) return;
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
