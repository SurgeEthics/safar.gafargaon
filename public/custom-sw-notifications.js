/**
 * Custom Service Worker Event Listener for Safar Android & PWA Push Notifications.
 * Handles notification click actions:
 * 1. 'accept' -> [✅ গ্রহণ করুন (Accept)]
 * 2. 'open'   -> [📲 অ্যাপ খুলুন]
 * 3. Default click on notification body -> Focuses or opens app
 */

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action; // 'accept' | 'open' | ''
  const notifData = event.notification.data || {};
  const requestId = notifData.requestId || '';
  const targetUrl = notifData.url || (requestId ? `/?openDriverTrip=${requestId}&role=driver` : '/');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Try to find an existing open tab/window for Safar
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus().then((focusedClient) => {
            if (focusedClient && 'postMessage' in focusedClient) {
              focusedClient.postMessage({
                type: 'SAFAR_NOTIFICATION_ACTION',
                action: action || 'open',
                requestId: requestId,
                targetUrl: targetUrl,
                timestamp: Date.now()
              });
            }
            // If action is accept, also send explicit accept command
            if (action === 'accept' && focusedClient && 'postMessage' in focusedClient) {
              focusedClient.postMessage({
                type: 'SAFAR_DRIVER_ACCEPT_RIDE',
                requestId: requestId,
                timestamp: Date.now()
              });
            }
            return focusedClient;
          });
        }
      }

      // 2. If no window is open, open a new window
      if (self.clients.openWindow) {
        const fullUrl = action === 'accept' 
          ? `${targetUrl}&autoAccept=true`
          : targetUrl;
        return self.clients.openWindow(fullUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  // Notification dismissed by user
});
