// Safar (সফর) Service Worker Notification & Action Click Engine
// Ensures notification action buttons [✅ গ্রহণ করুন (ACCEPT)] and [📲 অ্যাপ খুলুন] execute cleanly

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const data = event.notification.data || {};
  const requestId = data.requestId;

  // Build target destination URL
  let targetUrl = '/?role=driver';
  if (requestId) {
    if (action === 'accept') {
      targetUrl = `/?openDriverTrip=${requestId}&role=driver&autoAccept=true`;
    } else {
      targetUrl = `/?openDriverTrip=${requestId}&role=driver`;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If an existing app window is open, focus it and send postMessage
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: action === 'accept' ? 'ACCEPT_RIDE_REQUEST' : 'OPEN_DRIVER_TRIP',
            requestId: requestId,
            action: action
          });
          if ('navigate' in client && targetUrl) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // 2. If no window is open, launch new window with autoAccept query param
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  // Handled on close
});
