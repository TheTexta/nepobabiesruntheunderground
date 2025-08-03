const CACHE_NAME = 'nbu-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './assets/css/styles.css',
  './assets/js/parallax.js',
  './assets/js/tvstatic.js',
  './assets/js/sw-register.js',
  './assets/images/favicons/favicon.ico',
  './assets/images/favicons/favicon-16x16.png',
  './assets/images/favicons/favicon-32x32.png',
  './assets/images/favicons/favicon-96x96.png',
  './assets/images/favicons/apple-touch-icon.png',
  './assets/images/favicons/android-chrome-192x192.png',
  './assets/images/favicons/android-chrome-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
