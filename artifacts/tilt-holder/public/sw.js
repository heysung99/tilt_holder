// Intentionally does no caching — this app always needs live data from /api.
// It exists for home-screen installability and to show push notifications.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'TILT HOLDER', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      // Same tag replaces the previous notification (e.g. repeated buy-in updates)
      // instead of stacking; renotify still alerts for the replacement.
      tag: data.tag,
      renotify: Boolean(data.tag),
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) return existing.focus();
    return self.clients.openWindow('/');
  })());
});
