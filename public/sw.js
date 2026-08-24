/* MBBSWala Service Worker — Push Notifications */
const CACHE_NAME = 'mbbswala-sw-v2'; // bumped to invalidate old cached assets

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle incoming push events
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'MBBSWala Notification', body: event.data?.text() || 'You have a new notification' };
  }

  const title = data.title || 'MBBSWala';
  const options = {
    body: data.body || '',
    icon: '/images/mbbswala/logo.png',
    badge: '/images/mbbswala/logo.png',
    vibrate: [200, 100, 200, 100, 200],
    sound: '/notification.mp3',
    data: data.data || {},
    actions: data.actions || [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    requireInteraction: true, // keeps notification visible until user interacts
    tag: data.tag || 'mbbswala-notification',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notifData = event.notification.data || {};

  if (action === 'dismiss') return;

  const urlToOpen = notifData.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If app is already open, focus it and navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync (optional)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
});
