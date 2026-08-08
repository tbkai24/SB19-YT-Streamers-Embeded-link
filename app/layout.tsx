import type { Metadata } from 'next';
import './globals.css';
import { PwaInstaller } from '@/components/public/pwa-installer';

export const metadata: Metadata = {
  title: 'SB19 Stream Hub - Verified Articles & Releases',
  description: 'Centralized directory of streaming articles for SB19 songs, albums, and campaigns created by A’TIN for A’TIN.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SB19 Hub',
  },
  openGraph: {
    title: 'SB19 Stream Hub',
    description: 'Centralized directory of streaming articles for SB19 releases.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-rose-500/20 selection:text-rose-900 bg-slate-50 text-slate-900">
        {children}
        <PwaInstaller />
      </body>
    </html>
  );
}
