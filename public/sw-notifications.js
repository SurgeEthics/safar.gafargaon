// Safar Gafargaon - Service Worker Notification Click & Action Handler
// Handles Android notification buttons [✅ গ্রহণ করুন (ACCEPT)] and [📲 অ্যাপ খুলুন]

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  const requestId = data.requestId || '';
  
  const targetUrl = action === 'accept'
    ? `/?openDriverTrip=${requestId}&role=driver&action=accept`
    : (data.url || `/?openDriverTrip=${requestId}&role=driver`);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If Safar is already open in a tab or PWA window, focus and navigate it
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          try {
            client.postMessage({
              type: 'SAFAR_NOTIFICATION_ACTION',
              action: action || 'open',
              requestId: requestId,
              url: targetUrl
            });
          } catch (e) {}
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

self.addEventListener('notificationclose', (event) => {
  // Notification dismissed by user
});
