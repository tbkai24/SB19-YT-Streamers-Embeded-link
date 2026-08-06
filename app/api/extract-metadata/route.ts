import { NextResponse } from 'next/server';
import { normalizeUrl, decodeHtmlEntities } from '@/lib/url-normalizer';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const cleanUrl = normalizeUrl(url);
    const parsedUrl = new URL(cleanUrl);

    // Fetch target URL HTML with standard user agent
    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({
        url: cleanUrl,
        canonicalUrl: cleanUrl,
        title: parsedUrl.hostname.replace('www.', ''),
        description: 'No description available.',
        websiteName: parsedUrl.hostname.replace('www.', ''),
        thumbnail: '',
        favicon: `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`,
      });
    }

    const html = await response.text();

    // Helper regex extractors
    const getMetaTag = (prop: string) => {
      const match =
        html.match(new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]*name=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${prop}["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${prop}["']`, 'i'));
      return match ? match[1] : '';
    };

    const getTitle = () => {
      const ogTitle = getMetaTag('og:title') || getMetaTag('twitter:title');
      if (ogTitle) return decodeHtmlEntities(ogTitle);
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      return titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : parsedUrl.hostname.replace('www.', '');
    };

    const getDescription = () => {
      const desc = getMetaTag('og:description') || getMetaTag('description') || getMetaTag('twitter:description') || '';
      return decodeHtmlEntities(desc);
    };

    const getThumbnail = () => {
      const ogImage = getMetaTag('og:image') || getMetaTag('twitter:image');
      if (ogImage) {
        if (ogImage.startsWith('http')) return ogImage;
        if (ogImage.startsWith('/')) return `${parsedUrl.protocol}//${parsedUrl.host}${ogImage}`;
      }
      return '';
    };

    const getWebsiteName = () => {
      const siteName = getMetaTag('og:site_name');
      if (siteName) return decodeHtmlEntities(siteName);
      const host = parsedUrl.hostname.replace('www.', '');
      return host.charAt(0).toUpperCase() + host.slice(1);
    };

    const getCanonical = () => {
      const match = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
      return match ? match[1] : cleanUrl;
    };

    return NextResponse.json({
      url: cleanUrl,
      canonicalUrl: getCanonical(),
      title: getTitle(),
      description: getDescription(),
      websiteName: getWebsiteName(),
      thumbnail: getThumbnail(),
      favicon: `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to extract metadata' }, { status: 500 });
  }
}
