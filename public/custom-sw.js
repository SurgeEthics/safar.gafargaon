// Custom Service Worker logic for Safar Gafargaon Driver Notifications & Action Buttons
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  const requestId = data.requestId || '';
  
  // URL to navigate to if no window is active
  const targetUrl = action === 'accept'
    ? `/?autoAcceptTrip=${encodeURIComponent(requestId)}&role=driver`
    : `/?openDriverTrip=${encodeURIComponent(requestId)}&role=driver`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open in any tab, focus it and post action message
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: action === 'accept' ? 'NOTIFICATION_ACTION_ACCEPT' : 'NOTIFICATION_ACTION_OPEN',
            action: action || 'open',
            requestId: requestId,
            timestamp: Date.now()
          });
          return;
        }
      }
      // If no window is open, open a new window with the direct action URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  const data = event.notification.data || {};
  const requestId = data.requestId || '';
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    clientList.forEach((client) => {
      client.postMessage({
        type: 'NOTIFICATION_ACTION_DISMISS',
        requestId: requestId,
        timestamp: Date.now()
      });
    });
  });
});
