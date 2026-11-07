// Safar Gafargaon - Service Worker Push & Notification Action Handler
// Handles background Web Push alerts & Android notification buttons [✅ গ্রহণ করুন (ACCEPT)] and [📲 অ্যাপ খুলুন]

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const requestId = payload.requestId || '';
  const title = payload.title || '🚖 নতুন যাত্রার অনুরোধ এসেছে! (সফর গফরগাঁও)';
  const body =
    payload.body ||
    'সফর অ্যাপের সম্মানিত চালক, আপনার একটি নতুন যাত্রার অনুরোধ এসেছে। দ্রুত অ্যাপ খুলে গ্রহণ করুন।';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/safar-logo.png',
      badge: '/notification-badge.png',
      tag: 'safar-driver-incoming-ride',
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [600, 200, 600, 200, 800, 300, 600],
      data: {
        requestId,
        url: `/?openDriverTrip=${requestId}&role=driver`,
      },
      actions: [
        { action: 'accept', title: '✅ গ্রহণ করুন (ACCEPT)' },
        { action: 'open', title: '📲 অ্যাপ খুলুন' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action || 'open';
  const data = event.notification.data || {};
  const requestId = data.requestId || '';

  const targetUrl =
    action === 'accept'
      ? `/?openDriverTrip=${requestId}&role=driver&action=accept`
      : `/?openDriverTrip=${requestId}&role=driver&action=open`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If Safar is already open in a tab or PWA window, focus and postMessage directly
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          try {
            client.postMessage({
              type: 'SAFAR_NOTIFICATION_ACTION',
              action,
              requestId,
              url: targetUrl,
            });
          } catch (e) {}

          if (
            client.url &&
            self.location &&
            client.url.startsWith(self.location.origin)
          ) {
            return client;
          }

          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
          return client;
        }
      }

      // 2. Otherwise open fresh window/tab
      if (self.clients && self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', () => {
  // Notification dismissed by user
});
