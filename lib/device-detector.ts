export type DeviceType = 'mobile' | 'desktop' | 'tablet';

export function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';

  const ua = navigator.userAgent || '';

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}

const COUNTRY_CACHE_KEY = 'sb19_user_country_code';

export async function detectCountryCode(): Promise<string> {
  if (typeof window === 'undefined') return 'PH';

  try {
    const cached = sessionStorage.getItem(COUNTRY_CACHE_KEY);
    if (cached) return cached;

    // Provider 1: ipwho.is (Fast, reliable, free CORS)
    try {
      const res1 = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(2000) });
      if (res1.ok) {
        const data1 = await res1.json();
        if (data1.country_code) {
          sessionStorage.setItem(COUNTRY_CACHE_KEY, data1.country_code);
          return data1.country_code;
        }
      }
    } catch {
      // Fallback to provider 2
    }

    // Provider 2: ipapi.co
    try {
      const res2 = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(2000) });
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.country_code) {
          sessionStorage.setItem(COUNTRY_CACHE_KEY, data2.country_code);
          return data2.country_code;
        }
      }
    } catch {
      // Fallback
    }
  } catch {
    // Ignore timeout/error, fallback to PH
  }

  return 'PH';
}

export function getCountryFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export const COUNTRY_NAMES: Record<string, string> = {
  PH: 'Philippines',
  US: 'United States',
  AE: 'United Arab Emirates',
  JP: 'Japan',
  CA: 'Canada',
  GB: 'United Kingdom',
  AU: 'Australia',
  SG: 'Singapore',
  KR: 'South Korea',
  MY: 'Malaysia',
  TH: 'Thailand',
  ID: 'Indonesia',
  SA: 'Saudi Arabia',
  QA: 'Qatar',
  KW: 'Kuwait',
  IT: 'Italy',
  ES: 'Spain',
  DE: 'Germany',
  FR: 'France',
};

export function normalizeReferrer(referrerUrl?: string | null): string {
  if (!referrerUrl || typeof referrerUrl !== 'string' || !referrerUrl.trim()) {
    return 'Direct Link';
  }
  const ref = referrerUrl.toLowerCase().trim();

  if (ref.includes('localhost') || ref.includes('127.0.0.1') || ref.includes('::1')) {
    return 'Localhost';
  }
  if (ref.includes('twitter') || ref.includes('t.co') || ref.includes('x.com') || ref.includes('com.twitter.android')) {
    return 'Twitter (X)';
  }
  if (ref.includes('facebook') || ref.includes('fb.me') || ref.includes('fb.com') || ref.includes('com.facebook.katana') || ref.includes('com.facebook.orca')) {
    return 'Facebook';
  }
  if (ref.includes('instagram') || ref.includes('com.instagram.android')) {
    return 'Instagram';
  }
  if (ref.includes('youtube') || ref.includes('youtu.be') || ref.includes('com.google.android.youtube')) {
    return 'YouTube';
  }
  if (ref.includes('threads') || ref.includes('threads.net')) {
    return 'Threads';
  }
  if (ref.includes('tiktok') || ref.includes('musically') || ref.includes('com.ss.android.ugc.trill')) {
    return 'TikTok';
  }
  if (ref.includes('telegram') || ref.includes('org.telegram.messenger')) {
    return 'Telegram';
  }
  if (ref.includes('discord') || ref.includes('com.discord')) {
    return 'Discord';
  }
  if (ref.includes('google.') || ref.includes('googlequicksearchbox')) {
    return 'Google Search';
  }
  try {
    const rawUrl = ref.startsWith('android-app://') ? ref.replace('android-app://', 'https://') : ref;
    const domain = new URL(rawUrl).hostname.replace('www.', '');
    return domain || 'Direct Link';
  } catch {
    return 'Direct Link';
  }
}

let cachedClientIp = '';

export async function getClientIp(): Promise<string> {
  if (typeof window === 'undefined') return '127.0.0.1';
  if (cachedClientIp) return cachedClientIp;

  try {
    const cached = sessionStorage.getItem('sb19_user_client_ip');
    if (cached) {
      cachedClientIp = cached;
      return cached;
    }

    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      if (data.ip) {
        cachedClientIp = data.ip;
        sessionStorage.setItem('sb19_user_client_ip', data.ip);
        return data.ip;
      }
    }
  } catch {
    // Ignore timeout
  }

  let fallbackHash = sessionStorage.getItem('sb19_ip_fallback');
  if (!fallbackHash) {
    fallbackHash = 'ip_' + Math.random().toString(36).substring(2, 11);
    sessionStorage.setItem('sb19_ip_fallback', fallbackHash);
  }
  return fallbackHash;
}
