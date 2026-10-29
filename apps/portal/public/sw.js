/*
 * CROSSUB agent app service worker: shows push alerts (Jarvis 2.2) — the morning briefing and
 * CROSSUB team replies in Cros — and opens the app where the alert points when tapped. It does
 * not cache pages; the app always loads from the network.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let alert = { title: 'CROSSUB', body: '', data: {} };
  try {
    alert = { ...alert, ...(event.data ? event.data.json() : {}) };
  } catch {
    alert.body = event.data ? event.data.text() : '';
  }
  event.waitUntil(
    self.registration.showNotification(alert.title, {
      body: alert.body,
      icon: '/icon-192.png',
      badge: '/favicon-32.png',
      data: alert.data,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = (event.notification.data && event.notification.data.href) || '/dashboard';
  const url = new URL(href, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      if (open) return open.navigate(url).then((w) => (w || open).focus());
      return self.clients.openWindow(url);
    }),
  );
});
