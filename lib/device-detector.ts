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

    // Use fast free IP geolocation API
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      if (data.country_code) {
        sessionStorage.setItem(COUNTRY_CACHE_KEY, data.country_code);
        return data.country_code;
      }
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
