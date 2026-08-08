/**
 * Normalizes a URL by removing tracking parameters (UTM, fbclid, gclid, etc.),
 * stripping trailing slashes, ensuring consistent protocol, and returning a clean string.
 */
export function normalizeUrl(rawUrl: string): string {
  if (!rawUrl) return '';

  let formatted = rawUrl.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = `https://${formatted}`;
  }

  try {
    const parsed = new URL(formatted);
    
    // Params to strip
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', '_ga', '_gl', 'ref', 'source', 'share_id'
    ];

    trackingParams.forEach(param => parsed.searchParams.delete(param));

    // Reconstruct clean URL
    let clean = `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname}`;
    
    // Strip trailing slash if path is longer than '/'
    if (clean.length > 1 && clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }

    // Append remaining valid search params if any
    const remainingParams = parsed.searchParams.toString();
    if (remainingParams) {
      clean += `?${remainingParams}`;
    }

    return clean;
  } catch (error) {
    return rawUrl.trim();
  }
}

/**
 * Extracts 11-character YouTube video ID from various YouTube URL formats.
 */
export function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match && match[1] ? match[1] : null;
}

/**
 * Checks if a given input URL matches a canonical/normalized URL in an existing list.
 */
export function isDuplicateUrl(inputUrl: string, existingUrls: string[]): boolean {
  const normalizedInput = normalizeUrl(inputUrl);
  return existingUrls.some(url => normalizeUrl(url) === normalizedInput);
}

/**
 * Decodes all numeric (e.g. &#8216;, &#8217;, &#x27;, &#39;) and named HTML entities into clean human-readable text.
 * Uses multi-pass decoding to handle double-encoded entities (e.g. &amp;#x27; -> &#x27; -> ').
 */
export function decodeHtmlEntities(str?: string | null): string {
  if (!str) return '';

  let curr = str;
  let prev = '';

  // Up to 3 passes to unwrap double/triple HTML entity encoding
  for (let pass = 0; pass < 3; pass++) {
    prev = curr;

    // 1. Decode numeric decimal entities: &#8216; -> ‘, &#39; -> '
    curr = curr.replace(/&#(\d+);?/g, (_, dec) => {
      try {
        const code = parseInt(dec, 10);
        return String.fromCharCode(code);
      } catch {
        return _;
      }
    });

    // 2. Decode numeric hex entities: &#x27; -> ', &#x2018; -> ‘
    curr = curr.replace(/&#x([0-9a-fA-F]+);?/g, (_, hex) => {
      try {
        const code = parseInt(hex, 16);
        return String.fromCharCode(code);
      } catch {
        return _;
      }
    });

    // 3. Decode common named entities
    curr = curr
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lsquo;/g, '‘')
      .replace(/&rsquo;/g, '’')
      .replace(/&ldquo;/g, '“')
      .replace(/&rdquo;/g, '”')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ');

    if (curr === prev) break;
  }

  return curr;
}

/**
 * List of domain / platform keywords that should NOT be selected as Article of the Day.
 * You can add any keyword (e.g. 'reddit', 'genius', 'google', 'quora', etc.) to this array.
 */
export const EXCLUDED_SPOTLIGHT_KEYWORDS: string[] = [
  'reddit',
  'genius',
  'google',
  'twitter',
  'x.com',
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'pinterest',
  'wikipedia',
];

/**
 * Helper to check if an article is eligible to be picked as Article of the Day.
 */
export function isEligibleForArticleOfTheDay(article: { article_url?: string; canonical_url?: string; website_name?: string }): boolean {
  if (!article) return false;
  const url = (article.article_url || '').toLowerCase();
  const canon = (article.canonical_url || '').toLowerCase();
  const site = (article.website_name || '').toLowerCase();

  return !EXCLUDED_SPOTLIGHT_KEYWORDS.some(kw =>
    url.includes(kw) || canon.includes(kw) || site.includes(kw)
  );
}

/**
 * Automatically translates foreign text to English using Google Translate endpoint.
 * Returns clean translated text or original decoded text if translation fails/is already English.
 */
export async function translateTextToEnglish(text: string): Promise<string> {
  if (!text || !text.trim()) return text;
  const decoded = decodeHtmlEntities(text);

  // 1. Try server-side route
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: decoded }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.translated && data.translated.trim().toLowerCase() !== decoded.trim().toLowerCase()) {
        return decodeHtmlEntities(data.translated);
      }
    }
  } catch {
    // Ignore
  }

  // 2. Client-side MyMemory API fallback (Works 100% in browser CORS)
  try {
    const mmRes = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(decoded)}&langpair=autodetect|en`
    );
    if (mmRes.ok) {
      const mmData = await mmRes.json();
      const translatedText = mmData?.responseData?.translatedText;
      if (translatedText && typeof translatedText === 'string' && translatedText.trim()) {
        return decodeHtmlEntities(translatedText.trim());
      }
    }
  } catch {
    // Ignore
  }

  return decoded;
}
