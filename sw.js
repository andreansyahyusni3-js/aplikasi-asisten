// Naikkan versi versi ini (misal v1.1 -> v1.2) tiap kali kamu update index.html di GitHub
const CACHE_NAME = 'asisten-sales-v1.1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// 1. Install & simpan aset ke memori HP
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Hapus cache versi lama pas ada pembaruan
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Ambil data dari internet, kalau offline pake cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
