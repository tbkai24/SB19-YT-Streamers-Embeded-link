import { Profile, Article, ArticleSubmission, ExtractedMetadata, AnalyticsEvent, DailyTrafficStat } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { normalizeUrl, isDuplicateUrl } from './url-normalizer';
import { detectDeviceType, detectCountryCode, normalizeReferrer } from './device-detector';

const LOCAL_STORAGE_KEY_PROFILES = 'sb19_hub_profiles_v6';
const LOCAL_STORAGE_KEY_ARTICLES = 'sb19_hub_articles_v6';
const LOCAL_STORAGE_KEY_SUBMISSIONS = 'sb19_hub_submissions_v6';
const LOCAL_STORAGE_KEY_ANALYTICS = 'sb19_hub_analytics_events_v6';
const LOCAL_STORAGE_KEY_DAILY_TRAFFIC = 'sb19_hub_daily_traffic_v6';

// 1. PROFILES
export function getStoredProfiles(): Profile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PROFILES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProfiles(profiles: Profile[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  }
}

export async function fetchProfilesFromSupabase(): Promise<Profile[]> {
  try {
    const supabase = createClient();
    const queryPromise = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    const timeoutPromise = new Promise<{ data: any; error: any }>(resolve =>
      setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 1200)
    );

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (!error && data) {
      saveProfiles(data as Profile[]);
      return data as Profile[];
    }
  } catch {
    // Ignore, fallback to stored profiles
  }
  return getStoredProfiles();
}

export async function saveProfileToSupabase(profile: Partial<Profile>): Promise<{ success: boolean; error?: string; data?: Profile }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .upsert(profile)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Supabase saveProfile notice:', error.message || error);
      const friendlyErr = error.code === '23505'
        ? 'A profile with this URL slug already exists.'
        : error.message || 'Unable to save profile to database.';
      return { success: false, error: friendlyErr };
    }

    if (data) {
      const all = getStoredProfiles();
      const idx = all.findIndex(p => p.id === data.id);
      if (idx >= 0) all[idx] = data as Profile;
      else all.unshift(data as Profile);
      saveProfiles(all);
      return { success: true, data: data as Profile };
    }
  } catch (err: any) {
    console.warn('Supabase saveProfile notice:', err?.message || err);
    return { success: false, error: err?.message || 'Server error while saving profile.' };
  }
  return { success: false, error: 'Database save failed.' };
}

// 2. ARTICLES
export function getStoredArticles(): Article[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_ARTICLES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveArticles(articles: Article[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY_ARTICLES, JSON.stringify(articles));
  }
}

export async function fetchArticlesFromSupabase(): Promise<Article[]> {
  try {
    const supabase = createClient();
    const queryPromise = supabase
      .from('articles')
      .select('*')
      .order('display_order', { ascending: true });

    const timeoutPromise = new Promise<{ data: any; error: any }>(resolve =>
      setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 1200)
    );

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (!error && data) {
      saveArticles(data as Article[]);
      return data as Article[];
    }
  } catch {
    // Ignore
  }
  return getStoredArticles();
}

export async function saveArticleToSupabase(article: Partial<Article>): Promise<{ success: boolean; error?: string; data?: Article }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('articles')
      .upsert(article)
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message || 'Failed to save article to database.' };
    }

    if (data) {
      const all = getStoredArticles();
      const idx = all.findIndex(a => a.id === data.id);
      if (idx >= 0) all[idx] = data as Article;
      else all.unshift(data as Article);
      saveArticles(all);
      return { success: true, data: data as Article };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Server error while saving article.' };
  }
  return { success: false, error: 'Failed to save article.' };
}

// 3. SUBMISSIONS
export function getStoredSubmissions(): ArticleSubmission[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SUBMISSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSubmissions(submissions: ArticleSubmission[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions));
  }
}

export async function fetchSubmissionsFromSupabase(): Promise<ArticleSubmission[]> {
  try {
    const supabase = createClient();
    const queryPromise = supabase
      .from('article_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    const timeoutPromise = new Promise<{ data: any; error: any }>(resolve =>
      setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 1200)
    );

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (!error && data) {
      saveSubmissions(data as ArticleSubmission[]);
      return data as ArticleSubmission[];
    }
  } catch {
    // Ignore
  }
  return getStoredSubmissions();
}

export async function approveSubmissionInSupabase(sub: ArticleSubmission, newArt: Article) {
  try {
    const supabase = createClient();
    await supabase.from('articles').upsert(newArt);
    await supabase.from('article_submissions').update({
      status: 'approved',
      reviewed_at: new Date().toISOString()
    }).eq('id', sub.id);
  } catch (err) {
    console.error('Error approving submission in Supabase:', err);
  }
}

export async function updateSubmissionStatusInSupabase(subId: string, status: 'rejected' | 'duplicate', notes?: string) {
  try {
    const supabase = createClient();
    await supabase.from('article_submissions').update({
      status,
      notes: notes || null,
      reviewed_at: new Date().toISOString()
    }).eq('id', subId);
  } catch (err) {
    console.error('Error updating submission status in Supabase:', err);
  }
}

export async function updateSubmissionInSupabase(sub: ArticleSubmission) {
  try {
    const supabase = createClient();
    await supabase.from('article_submissions').upsert(sub);
  } catch (err) {
    console.error('Error updating submission in Supabase:', err);
  }
}

export function clearAllData() {
  if (typeof window !== 'undefined') {
    const keys = [
      'sb19_hub_profiles_v5', 'sb19_hub_profiles_v4', 'sb19_hub_profiles_v3', 'sb19_hub_profiles_v2', 'sb19_hub_profiles_v1', 'sb19_hub_profiles', 'sb19_profiles',
      'sb19_hub_articles_v5', 'sb19_hub_articles_v4', 'sb19_hub_articles_v3', 'sb19_hub_articles_v2', 'sb19_hub_articles_v1', 'sb19_hub_articles', 'sb19_articles',
      'sb19_hub_submissions_v5', 'sb19_hub_submissions_v4', 'sb19_hub_submissions_v3', 'sb19_hub_submissions_v2', 'sb19_hub_submissions_v1', 'sb19_hub_submissions', 'sb19_submissions'
    ];
    keys.forEach(k => localStorage.removeItem(k));
  }
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function submitArticleLink(
  profileId: string,
  rawUrl: string,
  notes?: string,
  metadata?: Partial<ExtractedMetadata>
): { success: boolean; message: string; submission?: ArticleSubmission } {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) {
    return { success: false, message: 'Invalid URL provided.' };
  }

  const articles = getStoredArticles();
  const submissions = getStoredSubmissions();

  const publishedUrls = articles.map(a => a.canonical_url || a.article_url);
  if (isDuplicateUrl(normalized, publishedUrls)) {
    return { success: false, message: 'This article already exists.' };
  }

  const pendingUrls = submissions
    .filter(s => s.status === 'pending')
    .map(s => s.canonical_url || s.article_url);

  if (isDuplicateUrl(normalized, pendingUrls)) {
    return { success: false, message: 'This article already exists or is already pending review.' };
  }

  const newSubmission: ArticleSubmission = {
    id: generateUUID(),
    profile_id: profileId,
    article_url: rawUrl,
    canonical_url: metadata?.canonicalUrl || normalized,
    website_name: metadata?.websiteName || new URL(normalized).hostname.replace('www.', ''),
    title: metadata?.title || 'Submitted Article Link',
    thumbnail: metadata?.thumbnail || null,
    description: metadata?.description || null,
    notes: notes || null,
    status: 'pending',
    submitted_by_name: 'Community Fan',
    submitted_by_email: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const updated = [newSubmission, ...submissions];
  saveSubmissions(updated);

  // Sync to Supabase in background
  try {
    const supabase = createClient();
    supabase.from('article_submissions').insert(newSubmission).then();
  } catch {
    // Ignore
  }

  return { success: true, message: 'Thank you! Your article submission has been received for review.', submission: newSubmission };
}

export function getStoredAnalyticsEvents(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_ANALYTICS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAnalyticsEvents(events: AnalyticsEvent[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY_ANALYTICS, JSON.stringify(events));
  }
}

export async function fetchAnalyticsEventsFromSupabase(profileId: string): Promise<AnalyticsEvent[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      saveAnalyticsEvents(data as AnalyticsEvent[]);
      return data as AnalyticsEvent[];
    }
  } catch {
    // Ignore
  }
  return getStoredAnalyticsEvents().filter(e => e.profile_id === profileId);
}

export function getStoredDailyTrafficStats(): DailyTrafficStat[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_DAILY_TRAFFIC);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDailyTrafficStats(stats: DailyTrafficStat[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY_DAILY_TRAFFIC, JSON.stringify(stats));
  }
}

export async function fetchDailyTrafficStatsFromSupabase(profileId: string): Promise<DailyTrafficStat[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('daily_traffic_stats')
      .select('*')
      .eq('profile_id', profileId)
      .order('date', { ascending: false });

    if (!error && data) {
      saveDailyTrafficStats(data as DailyTrafficStat[]);
      return data as DailyTrafficStat[];
    }
  } catch {
    // Ignore
  }
  return getStoredDailyTrafficStats().filter(s => s.profile_id === profileId);
}

export function getVisitorHash(): string {
  if (typeof window === 'undefined') return 'anon';
  try {
    let hash = localStorage.getItem('sb19_visitor_hash');
    if (!hash) {
      hash = 'v_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      localStorage.setItem('sb19_visitor_hash', hash);
    }
    return hash;
  } catch {
    return 'anon';
  }
}

export async function recordProfileView(profileId: string) {
  if (typeof window === 'undefined' || !profileId) return;

  const device = detectDeviceType();
  const country = await detectCountryCode();
  const visitorHash = getVisitorHash();

  const profiles = getStoredProfiles();
  const idx = profiles.findIndex(p => p.id === profileId);
  let newCount = 1;
  let deviceMap: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
  let countryMap: Record<string, number> = {};

  if (idx >= 0) {
    const prof = profiles[idx];
    newCount = (prof.views_count || 0) + 1;
    prof.views_count = newCount;

    deviceMap = { mobile: 0, desktop: 0, tablet: 0, ...(prof.device_breakdown || {}) };
    deviceMap[device] = (deviceMap[device] || 0) + 1;
    prof.device_breakdown = deviceMap;

    countryMap = { ...(prof.country_breakdown || {}) };
    countryMap[country] = (countryMap[country] || 0) + 1;
    prof.country_breakdown = countryMap;

    saveProfiles(profiles);
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();
  const newEvent: AnalyticsEvent = {
    id: generateUUID(),
    profile_id: profileId,
    article_id: null,
    event_type: 'profile_view',
    visitor_hash: visitorHash,
    country,
    device,
    referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    created_at: nowIso,
  };

  const stored = getStoredAnalyticsEvents();
  saveAnalyticsEvents([newEvent, ...stored]);

  try {
    const supabase = createClient();
    await Promise.all([
      supabase.from('profiles').update({
        views_count: newCount,
        device_breakdown: deviceMap,
        country_breakdown: countryMap,
      }).eq('id', profileId),
      supabase.from('analytics_events').insert(newEvent),
      supabase.rpc('increment_daily_profile_view', {
        p_profile_id: profileId,
        p_date: todayStr,
        p_device: device,
        p_country: country,
        p_referrer: normalizeReferrer(newEvent.referrer),
      }),
    ]);
  } catch {
    // Ignore
  }
}

export async function recordArticleClick(articleId: string) {
  if (typeof window === 'undefined' || !articleId) return;

  const device = detectDeviceType();
  const country = await detectCountryCode();
  const visitorHash = getVisitorHash();

  const articles = getStoredArticles();
  const idx = articles.findIndex(a => a.id === articleId);
  let newCount = 1;
  let deviceMap: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
  let countryMap: Record<string, number> = {};
  let targetProfileId = '';

  if (idx >= 0) {
    const art = articles[idx];
    targetProfileId = art.profile_id;
    newCount = (art.clicks_count || 0) + 1;
    art.clicks_count = newCount;

    deviceMap = { mobile: 0, desktop: 0, tablet: 0, ...(art.device_breakdown || {}) };
    deviceMap[device] = (deviceMap[device] || 0) + 1;
    art.device_breakdown = deviceMap;

    countryMap = { ...(art.country_breakdown || {}) };
    countryMap[country] = (countryMap[country] || 0) + 1;
    art.country_breakdown = countryMap;

    saveArticles(articles);
  }

  if (targetProfileId) {
    const todayStr = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();
    const newEvent: AnalyticsEvent = {
      id: generateUUID(),
      profile_id: targetProfileId,
      article_id: articleId,
      event_type: 'article_click',
      visitor_hash: visitorHash,
      country,
      device,
      referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      created_at: nowIso,
    };

    const stored = getStoredAnalyticsEvents();
    saveAnalyticsEvents([newEvent, ...stored]);

    try {
      const supabase = createClient();
      await Promise.all([
        supabase.from('articles').update({
          clicks_count: newCount,
          device_breakdown: deviceMap,
          country_breakdown: countryMap,
        }).eq('id', articleId),
        supabase.from('analytics_events').insert(newEvent),
        supabase.rpc('increment_daily_article_click', {
          p_profile_id: targetProfileId,
          p_date: todayStr,
          p_device: device,
          p_country: country,
        }),
      ]);
    } catch {
      // Ignore
    }
  }
}
