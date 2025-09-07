const CACHE_NAME = 'nbu-cache-v2';
const ASSETS = [
  '.',
  'index.html',
  'me.html',
  'assets/css/styles.css',
  'js/blog.js',
  'js/noise.js',
  'js/tvstatic.js'
];

const RUNTIME_CACHE = 'nbu-runtime-cache-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-origin static assets: images, scripts, styles
  if (url.origin === location.origin &&
      (request.destination === 'image' || request.destination === 'script' || request.destination === 'style')) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(cache =>
        cache.match(request).then(cached =>
          cached || fetch(request).then(networkResponse => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          })
        )
      )
    );
    return;
  }

  // Default: try precache, fallback to network
  event.respondWith(
    caches.match(request).then(response => response || fetch(request))
  );
});

