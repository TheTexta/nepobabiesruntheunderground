// sw.js — v8 (no offline page)
const VERSION = '8';
const STATIC_CACHE = `static-v${VERSION}`;

// Compute base path for local dev vs GitHub Pages
const BASE = new URL(self.registration.scope).pathname.replace(/[^/]+$/, '');

// Keep this list short and immutable; other assets are cached at runtime.
const STATIC_ASSETS = [
  `${BASE}assets/css/styles.css`,
  `${BASE}assets/images/favicons/favicon-32x32.png`,
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;

  // Network-first for navigations (HTML documents)
  if (req.mode === 'navigate' || req.destination === 'document') {
  event.respondWith(fetch(req));
    return;
  }

  const url = new URL(req.url);

  // Cache-first for same-origin static assets under /assets/
  if (url.origin === location.origin && url.pathname.startsWith(`${BASE}assets/`)) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((res) => {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
          return res;
        })
      )
    );
  }
});

