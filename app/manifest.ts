import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  const logoUrl = 'https://res.cloudinary.com/wkmmjpzb/image/upload/f_auto,q_auto/JlaG7Bz8_400x400_pvb6mo.jpg';

  return {
    name: 'SB19 Streaming Hub',
    short_name: 'SB19 Streaming Hub',
    description: 'Official SB19 Music Streaming Hub, Release Links & Fan Articles Tracker',
    start_url: '/',
    id: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f172a',
    theme_color: '#e11d48',
    icons: [
      {
        src: logoUrl,
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: logoUrl,
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'maskable',
      },
      {
        src: logoUrl,
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: logoUrl,
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'maskable',
      },
    ],
  };
}
