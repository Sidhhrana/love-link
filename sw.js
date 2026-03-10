const APP_VERSION = '20260310-ux8';
const CACHE_NAME = `love-link-v${APP_VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  `./styles.css?v=${APP_VERSION}`,
  `./app.js?v=${APP_VERSION}`,
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Prefer fresh HTML so GitHub Pages deploys show up immediately.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') return response;
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Love Link', body: event.data ? event.data.text() : 'New signal' };
  }

  const title = payload.notification?.title || payload.title || 'Love Link';
  const body = payload.notification?.body || payload.body || 'New signal';
  const data = payload.data || {};

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      vibrate: [40, 80, 40],
      data
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = './index.html';
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of windows) {
      if ('focus' in w) {
        w.focus();
        return;
      }
    }
    if (clients.openWindow) await clients.openWindow(targetUrl);
  })());
});
