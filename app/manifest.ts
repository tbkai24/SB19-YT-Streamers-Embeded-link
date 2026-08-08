import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest & { gcm_sender_id?: string } {
  return {
    name: 'SB19 Streaming Hub',
    short_name: 'SB19 Streaming Hub',
    description: 'Official SB19 Music Streaming Hub, Release Links & Fan Articles Tracker',
    start_url: '/',
    scope: '/',
    id: '/',
    display: 'standalone',
    orientation: 'portrait',
    gcm_sender_id: '103953800507',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/icon-192.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/icon-192.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/icon-512.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'maskable',
      },
    ],
  };
}
