import { NextResponse } from 'next/server';
import { decodeHtmlEntities } from '@/lib/url-normalizer';

export async function POST(request: Request) {
  let rawText = '';
  try {
    const body = await request.json();
    rawText = body?.text || '';
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return NextResponse.json({ translated: rawText });
    }

    const decoded = decodeHtmlEntities(rawText);

    // Validation helper to reject MyMemory error responses
    const isValidTranslation = (trans: string) => {
      if (!trans || !trans.trim()) return false;
      const upper = trans.toUpperCase();
      if (upper.includes('PLEASE SELECT TWO DISTINCT LANGUAGES')) return false;
      if (upper.includes('MYMEMORY WARNING')) return false;
      if (upper.includes('INVALID LANGUAGE PAIR')) return false;
      return true;
    };

    // 1. Primary: Google Translate GTX (sl=auto)
    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(decoded)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data && data[0] && Array.isArray(data[0])) {
          const translatedParts = data[0]
            .map((item: any) => (Array.isArray(item) && typeof item[0] === 'string' ? item[0] : ''))
            .filter(Boolean);
          const translated = translatedParts.join(' ');
          if (isValidTranslation(translated) && translated.trim().toLowerCase() !== decoded.trim().toLowerCase()) {
            return NextResponse.json({ translated: decodeHtmlEntities(translated.trim()) });
          }
        }
      }
    } catch {
      // Ignore
    }

    // 2. Google Translate GTX (sl=id for Indonesian)
    try {
      const res2 = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=id&tl=en&dt=t&q=${encodeURIComponent(decoded)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        }
      );

      if (res2.ok) {
        const data2 = await res2.json();
        if (data2 && data2[0] && Array.isArray(data2[0])) {
          const translatedParts2 = data2[0]
            .map((item: any) => (Array.isArray(item) && typeof item[0] === 'string' ? item[0] : ''))
            .filter(Boolean);
          const translated2 = translatedParts2.join(' ');
          if (isValidTranslation(translated2) && translated2.trim().toLowerCase() !== decoded.trim().toLowerCase()) {
            return NextResponse.json({ translated: decodeHtmlEntities(translated2.trim()) });
          }
        }
      }
    } catch {
      // Ignore
    }

    // 3. MyMemory API (Strictly validated)
    try {
      const mmRes = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(decoded)}&langpair=id|en`
      );
      if (mmRes.ok) {
        const mmData = await mmRes.json();
        const translatedText = mmData?.responseData?.translatedText;
        if (
          translatedText &&
          typeof translatedText === 'string' &&
          isValidTranslation(translatedText) &&
          translatedText.trim().toLowerCase() !== decoded.trim().toLowerCase()
        ) {
          return NextResponse.json({ translated: decodeHtmlEntities(translatedText.trim()) });
        }
      }
    } catch {
      // Ignore
    }

    return NextResponse.json({ translated: decoded });
  } catch (error: any) {
    return NextResponse.json({ translated: rawText || '' });
  }
}
