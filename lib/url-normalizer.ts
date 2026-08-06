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
 * Checks if a given input URL matches a canonical/normalized URL in an existing list.
 */
export function isDuplicateUrl(inputUrl: string, existingUrls: string[]): boolean {
  const normalizedInput = normalizeUrl(inputUrl);
  return existingUrls.some(url => normalizeUrl(url) === normalizedInput);
}

/**
 * Decodes HTML entities (e.g. &quot;, &#39;, &amp;) into clean text characters.
 */
export function decodeHtmlEntities(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}
