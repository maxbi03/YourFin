/* Service worker YourFin — cache hors-ligne minimal.
   - Assets statiques (/_next/static, icônes) : cache-first (immuables).
   - Navigations : network-first avec repli sur la version en cache, puis sur la page d'accueil.
   Incrémente CACHE_VERSION pour invalider les anciens caches après un déploiement.

   BASE est déduit de l'URL du script lui-même (pas codé en dur) : le même fichier fonctionne
   tel quel servi à la racine (dev local, Vercel…) ou sous un sous-chemin (github.io/YourFin/). */
const CACHE_VERSION = "yourfin-v2";
const BASE = self.location.pathname.replace(/sw\.js$/, ""); // ex. "/" ou "/YourFin/"
const APP_SHELL = [BASE, `${BASE}manifest.webmanifest`, `${BASE}icons/icon-192.png`, `${BASE}icons/icon-512.png`];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation (HTML) : réseau d'abord, cache ensuite.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(BASE)) || Response.error()),
    );
    return;
  }

  // Assets : cache d'abord, réseau ensuite (et mise en cache).
  if (url.pathname.startsWith(`${BASE}_next/static/`) || url.pathname.startsWith(`${BASE}icons/`) || url.pathname.endsWith(".webmanifest")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
