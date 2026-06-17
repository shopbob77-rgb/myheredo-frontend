const CACHE_NAME = 'myheredo-v1';
const urlsToCache = [
  '/',
  '/dashboard.html',
  '/index.html',
  '/login.html',
  '/register.html',
  '/logo.png',
  '/style.css',
  '/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
