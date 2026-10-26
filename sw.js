const CACHE_NAME = 'asisten-sales-v12.8';

// Daftar aset penting yang di-precache saat instalasi
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://lh3.googleusercontent.com/d/1z5ecMUPltVrCR3X7EvMIPi3DGmPcxi6h'
];

// 1. INSTALL EVENT - Precache file utama
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Paksa SW baru langsung aktif tanpa menunggu tab ditutup
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching Core Assets (v12.8)');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// 2. ACTIVATE EVENT - Hapus seluruh cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting Old Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Ambil alih kontrol semua tab yang terbuka
  );
});

// 3. FETCH EVENT - Strategi Caching Pintar
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Abaikan request ke Firebase Firestore / API External (biarkan Firebase SDK menangani offline-nya sendiri)
  if (
    requestUrl.hostname.includes('firestore.googleapis.com') ||
    requestUrl.hostname.includes('firebaseio.com') ||
    requestUrl.hostname.includes('generativelanguage.googleapis.com')
  ) {
    return;
  }

  // STRATEGI NETWORK-FIRST UNTUK HTML & APP ROOT
  // Memastikan index.html SELALU diambil versi terbarunya dari server jika ada internet.
  if (event.request.mode === 'navigate' || requestUrl.pathname.endsWith('.html') || requestUrl.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Simpan salinan terbaru ke cache untuk cadangan offline
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Jika offline atau jaringan gagal, gunakan cadangan dari cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match('./index.html');
          });
        })
    );
    return;
  }

  // STRATEGI STALE-WHILE-REVALIDATE UNTUK CDN, LIBRARY & ASSET STATIS
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      // Kembalikan dari cache jika ada, sambil memperbarui cache dari network di background
      return cachedResponse || fetchPromise;
    })
  );
});
