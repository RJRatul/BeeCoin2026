self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'Cryptax', body: event.data.text() }; }

  const { title = 'Cryptax', body = '', icon = '/logo.png' } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/logo.png',
      vibrate: [200, 100, 200],
      requireInteraction: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/trade') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/trade');
    })
  );
});
