// SB19 Stream Hub Service Worker for PWA & Push Notifications

const CACHE_NAME = 'sb19-hub-cache-v1';
const BRAND_LOGO_URL = 'https://res.cloudinary.com/wkmmjpzb/image/upload/f_auto,q_auto/JlaG7Bz8_400x400_pvb6mo.jpg';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle Push Event from Web Push / Device Broadcast
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'SB19 Stream Hub', message: event.data.text() };
    }
  }

  const title = data.title || 'SB19 Stream Hub';
  const options = {
    body: data.message || 'New update available on SB19 Stream Hub!',
    icon: data.icon || BRAND_LOGO_URL,
    badge: BRAND_LOGO_URL,
    image: data.image || undefined,
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
    vibrate: [100, 50, 100],
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle Notification Click - Immediately navigates to target URL (e.g. /profile/sb19lawlessmvembeds)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
