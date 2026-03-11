// AishaCRM Service Worker — Web Push handler

// Activate immediately — don't wait for existing tabs to close
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// Take control of all open clients immediately after activation
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'AishaCRM', body: 'Ada notifikasi baru', icon: '/favicon.ico', tag: 'crm', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch { /* ignore parse error */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: '/favicon.ico',
      tag: data.tag,
      renotify: true,
      data: { url: data.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
