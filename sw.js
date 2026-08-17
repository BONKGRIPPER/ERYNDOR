/* Service worker: caches the app shell so it launches offline once
   installed, and keeps itself fresh via stale-while-revalidate (serve
   the cached copy instantly, then quietly fetch+cache the latest in
   the background for next time). Bump CACHE_NAME on any deploy that
   changes one of the precached files — that's what forces old clients
   to pick up the new version instead of serving a stale cache forever. */
const CACHE_NAME = 'leatheron-v1';
const PRECACHE = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/data.js',
  'js/sprites.js',
  'js/custom-content.js',
  'js/custom-sprites.js',
  'js/assets.js',
  'js/custom-assets.js',
  'js/core.js',
  'js/engine.js',
  'js/systems/cards.js',
  'js/systems/craft.js',
  'js/systems/food.js',
  'js/systems/township.js',
  'js/systems/farm.js',
  'js/systems/storage.js',
  'js/systems/market.js',
  'js/systems/consumables.js',
  'js/systems/world.js',
  'js/ui.js',
  'js/main.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
