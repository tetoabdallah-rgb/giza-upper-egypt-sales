const CACHE_NAME = 'giza-sales-v2026-10-06-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install Event
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate Event: Clear all outdated caches immediately
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Purging old service worker cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (e) => {
  const req = e.request;
  
  // 1. NEVER intercept non-GET requests (e.g. POST to Google Sheets or APIs)
  if (req.method !== 'GET') {
    return;
  }

  // 2. Only handle requests for same-origin assets
  // Let Google Apps Script, Firebase, Google Fonts, and external CDNs bypass SW completely
  if (!req.url.startsWith(self.location.origin)) {
    return;
  }

  // 3. For HTML documents & page navigations: Network First, fallback to cache if offline
  if (req.mode === 'navigate' || req.destination === 'document' || req.url.endsWith('index.html') || req.url.endsWith('/')) {
    e.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkRes;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match('./index.html')))
    );
    return;
  }

  // 4. For same-origin static assets: Stale-While-Revalidate
  e.respondWith(
    caches.match(req).then((cachedRes) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkRes;
        })
        .catch(() => cachedRes);
      return cachedRes || fetchPromise;
    })
  );
});
