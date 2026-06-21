const CACHE_NAME = 'myheredo-v2'; // ← Zwiększaj wersję przy każdej większej zmianie

// Pliki, które chcemy mieć offline (statyczne zasoby)
const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/login.html',
  '/register.html',
  '/logo.png',
  '/style.css',
  '/app.js'
];

// Instalacja
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // Natychmiast aktywuj nowy SW
  );
});

// Aktywacja + czyszczenie starych cache'y
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim()) // Przejmij kontrolę nad otwartymi kartami
  );
});

// Strategia fetch
self.addEventListener('fetch', event => {
  const { request } = event;

  // Dla nawigacji (strony HTML) używamy Network First
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Zapisujemy świeżą wersję do cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request)) // Jeśli offline — bierzemy z cache
    );
    return;
  }

  // Dla reszty plików (CSS, JS, obrazy) — Cache First
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then(response => {
          // Zapisujemy nowe pliki do cache
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(request, response.clone());
            return response;
          });
        });
      })
  );
});
