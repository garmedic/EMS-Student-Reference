// Service worker for the EMS Student Reference Book PWA.
// Everything the app needs (images, fonts fallback, styling) is already
// inlined in index.html, so caching that one file is enough for full
// offline use after the first successful load.
//
// IMPORTANT: bump CACHE_NAME (e.g. v2 -> v3) every time index.html is
// updated. That single-character change is what makes the browser notice
// this file is different, install the new version, and replace the old
// cached copy -- without it, everyone who already opened the app keeps
// seeing whatever was cached the first time, forever.
const CACHE_NAME = 'ems-booklet-v2';
const APP_SHELL = ['./index.html', './'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // The app page itself: try the network first so anyone online always
  // gets the latest content immediately, and only fall back to the
  // offline copy if there's no connection.
  if (event.request.mode === 'navigate' || event.request.url.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Everything else (fonts, etc.): cached copy first, network as backup.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
