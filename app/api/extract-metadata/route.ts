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
    const host = parsedUrl.hostname.toLowerCase().replace('www.', '');

    // 1. TikTok oEmbed handler (Extracts real video caption, author & thumbnail)
    if (host.includes('tiktok.com')) {
      try {
        const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`, {
          next: { revalidate: 3600 },
        });
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          const author = data.author_name || '';
          const rawCaption = data.title || '';
          const formattedTitle = author ? `${author}: ${rawCaption}` : (rawCaption || 'TikTok Video');

          return NextResponse.json({
            url: cleanUrl,
            canonicalUrl: cleanUrl,
            title: decodeHtmlEntities(formattedTitle),
            description: decodeHtmlEntities(rawCaption),
            websiteName: 'TikTok',
            thumbnail: data.thumbnail_url || '',
            favicon: 'https://www.google.com/s2/favicons?domain=tiktok.com&sz=64',
          });
        }
      } catch {
        // Fallthrough to standard scraper
      }
    }

    // 2. YouTube oEmbed handler (Extracts video title, channel & thumbnail)
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`, {
          next: { revalidate: 3600 },
        });
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          return NextResponse.json({
            url: cleanUrl,
            canonicalUrl: cleanUrl,
            title: decodeHtmlEntities(data.title || 'YouTube Video'),
            description: data.author_name ? `By ${data.author_name}` : 'YouTube Video',
            websiteName: 'YouTube',
            thumbnail: data.thumbnail_url || '',
            favicon: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64',
          });
        }
      } catch {
        // Fallthrough
      }
    }

    // 3. X (Twitter) oEmbed handler
    if (host.includes('twitter.com') || host.includes('x.com')) {
      try {
        const oembedRes = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(cleanUrl)}`, {
          next: { revalidate: 3600 },
        });
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          // Strip HTML tags from tweet embed HTML
          const tweetText = (data.html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          const author = data.author_name ? `@${data.author_name}` : 'X Post';
          
          return NextResponse.json({
            url: cleanUrl,
            canonicalUrl: cleanUrl,
            title: decodeHtmlEntities(tweetText ? `${author}: ${tweetText.slice(0, 120)}...` : `Post by ${author} on X`),
            description: decodeHtmlEntities(tweetText),
            websiteName: 'X (Twitter)',
            thumbnail: '',
            favicon: 'https://www.google.com/s2/favicons?domain=x.com&sz=64',
          });
        }
      } catch {
        // Fallthrough
      }
    }

    // 4. Standard scraper with Social Bot User-Agent (for Facebook, IG, News articles)
    const isSocial = ['facebook.com', 'fb.com', 'instagram.com', 'threads.net'].some(s => host.includes(s));
    const userAgent = isSocial
      ? 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const response = await fetch(cleanUrl, {
      headers: { 'User-Agent': userAgent },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json(createFallbackResponse(cleanUrl, parsedUrl));
    }

    const html = await response.text();

    const getMetaTag = (prop: string) => {
      const match =
        html.match(new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]*name=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${prop}["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${prop}["']`, 'i'));
      return match ? match[1] : '';
    };

    let extractedTitle = getMetaTag('og:title') || getMetaTag('twitter:title');
    if (!extractedTitle) {
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch) extractedTitle = titleMatch[1].trim();
    }

    // Smart cleanup for generic titles
    const cleanTitle = cleanExtractedTitle(extractedTitle, parsedUrl);
    const desc = decodeHtmlEntities(getMetaTag('og:description') || getMetaTag('description') || getMetaTag('twitter:description') || '');

    const ogImage = getMetaTag('og:image') || getMetaTag('twitter:image');
    let thumbnail = '';
    if (ogImage) {
      if (ogImage.startsWith('http')) thumbnail = ogImage;
      else if (ogImage.startsWith('/')) thumbnail = `${parsedUrl.protocol}//${parsedUrl.host}${ogImage}`;
    }

    const siteName = getMetaTag('og:site_name') || getWebsiteNameFromHost(host);
    const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
    const ogUrlMatch = html.match(/<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']*)["']/i);
    
    const rawCanonical = canonicalMatch ? canonicalMatch[1] : (ogUrlMatch ? ogUrlMatch[1] : cleanUrl);
    const resolvedCanonical = normalizeUrl(rawCanonical.startsWith('http') ? rawCanonical : `${parsedUrl.protocol}//${parsedUrl.host}${rawCanonical}`);

    return NextResponse.json({
      url: cleanUrl,
      canonicalUrl: resolvedCanonical,
      title: decodeHtmlEntities(cleanTitle),
      description: desc,
      websiteName: decodeHtmlEntities(siteName),
      thumbnail: thumbnail,
      favicon: `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to extract metadata' }, { status: 500 });
  }
}

function getWebsiteNameFromHost(host: string): string {
  if (host.includes('tiktok')) return 'TikTok';
  if (host.includes('facebook') || host.includes('fb.')) return 'Facebook';
  if (host.includes('twitter') || host.includes('x.com')) return 'X (Twitter)';
  if (host.includes('instagram')) return 'Instagram';
  if (host.includes('youtube') || host.includes('youtu.be')) return 'YouTube';
  if (host.includes('threads')) return 'Threads';
  const clean = host.replace('www.', '');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function cleanExtractedTitle(title: string, parsedUrl: URL): string {
  const host = parsedUrl.hostname.toLowerCase();
  const path = parsedUrl.pathname;

  // Check if title is generic domain fallback
  const isGeneric = !title || 
    title.toLowerCase().includes('tiktok - make your day') ||
    title.toLowerCase() === 'tiktok' ||
    title.toLowerCase() === 'x.com' ||
    title.toLowerCase() === 'facebook' ||
    title.toLowerCase().includes('log in or sign up');

  if (isGeneric) {
    // Smart URL parsing for username / post
    if (host.includes('tiktok')) {
      const match = path.match(/@([^/]+)/);
      if (match) return `TikTok Video by @${match[1]}`;
      return 'TikTok Video';
    }
    if (host.includes('twitter') || host.includes('x.com')) {
      const parts = path.split('/').filter(Boolean);
      if (parts.length > 0) return `Post by @${parts[0]} on X`;
      return 'X (Twitter) Post';
    }
    if (host.includes('facebook') || host.includes('fb.')) {
      return 'Facebook Post';
    }
    if (host.includes('instagram')) {
      const parts = path.split('/').filter(Boolean);
      if (parts[0] === 'p' || parts[0] === 'reel') return 'Instagram Post';
      if (parts[0]) return `Instagram Post by @${parts[0]}`;
      return 'Instagram Post';
    }
    return parsedUrl.hostname.replace('www.', '');
  }

  // Strip generic branding suffixes
  return title
    .replace(/\s*\|\s*TikTok$/i, '')
    .replace(/\s*-\s*TikTok$/i, '')
    .replace(/\s*on TikTok$/i, '')
    .replace(/\s*\|\s*Facebook$/i, '')
    .replace(/\s*\/\s*X$/i, '');
}

function createFallbackResponse(cleanUrl: string, parsedUrl: URL) {
  const host = parsedUrl.hostname.replace('www.', '');
  return {
    url: cleanUrl,
    canonicalUrl: cleanUrl,
    title: cleanExtractedTitle('', parsedUrl),
    description: 'Social Media Post Link',
    websiteName: getWebsiteNameFromHost(host),
    thumbnail: '',
    favicon: `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`,
  };
}
