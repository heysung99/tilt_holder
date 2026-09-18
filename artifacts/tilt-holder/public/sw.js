// Intentionally does no caching — this app always needs live data from /api.
// Its only purpose is to satisfy the installability requirement some
// browsers still check for "Add to Home Screen" / beforeinstallprompt.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
