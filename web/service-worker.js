/* MDOT PRO PWA offline shell. App data remains in the browser's local storage. */
const CACHE_NAME = 'mdot-pro-shell-v1-24-1';
const APP_SHELL = [
  './', './index.html', './style.css', './app.js', './business-modules.js',
  './aluminium-module.js', './profiles.json', './logo.png', './manifest.webmanifest', './pwa.js', './cloud-sync.js', './service-worker.js',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('mdot-pro-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache dynamic API/auth data or the admin page: always go to the network.
  if (url.pathname.startsWith('/api/') || url.pathname === '/admin.html' || url.pathname === '/admin') return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  })));
});
