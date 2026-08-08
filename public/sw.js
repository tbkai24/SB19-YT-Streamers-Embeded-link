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

  // Use payload tag or generate consistent tag from title to deduplicate stacked notifications
  const notifTag = data.tag || data.id || ('sb19-notif-' + notifTitle.toLowerCase().replace(/[^a-z0-9]/g, '-'));

  const options = {
    body: notifMessage,
    icon: logoUrl,
    badge: logoUrl,
    tag: notifTag,
    renotify: true,
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
  };

  event.waitUntil(self.registration.showNotification(notifTitle, options));
});

// Handle Direct Message from Client/Admin Broadcast
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'TRIGGER_PUSH' || event.data.action === 'showNotification')) {
    const { title, message, url } = event.data;
    const origin = self.location.origin;
    const logoUrl = origin + '/assets/ytslogo.jpg';

    const notifTitle = title || 'SB19 Streaming Hub';
    const notifMessage = message || 'New release update available!';

    const options = {
      body: notifMessage,
      icon: logoUrl,
      badge: logoUrl,
      tag: 'sb19-push-' + Date.now(),
      renotify: true,
      data: {
        url: url || '/',
        timestamp: Date.now(),
      },
    };

    event.waitUntil(self.registration.showNotification(notifTitle, options));
  }
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
