// SB19 Streaming Hub Service Worker for PWA & Push Notifications

const CACHE_NAME = 'sb19-streaming-hub-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Push Event from Web Push / Device Broadcast
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'SB19 Streaming Hub', message: event.data.text() };
    }
  }

  const notifTitle = data.title || 'SB19 Streaming Hub';
  const notifMessage = data.message || data.body || 'New update available on SB19 Streaming Hub!';
  const origin = self.location.origin;
  const logoUrl = origin + '/assets/ytslogo.jpg';

  // Strict single notification tag - replaces any previous notification so EXACTLY 1 banner is shown
  const notifTag = data.id ? ('sb19-msg-' + data.id) : 'sb19-single-push-notification';

  const options = {
    body: notifMessage,
    icon: logoUrl,
    badge: logoUrl,
    tag: notifTag,
    renotify: false,
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(notifTitle, options));
});

// Handle Notification Click - Navigates directly to target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const fullTargetUrl = new URL(targetUrl, self.location.origin).href;
      for (const client of clientList) {
        if (client.url === fullTargetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullTargetUrl);
      }
    })
  );
});
