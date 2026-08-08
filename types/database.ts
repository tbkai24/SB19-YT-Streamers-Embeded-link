export type ProfileStatus = 'published' | 'draft' | 'archived';
export type ArticleStatus = 'published' | 'draft' | 'archived';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'duplicate' | 'archived';
export type AnalyticsEventType = 'profile_view' | 'article_click' | 'submit_attempt';

export interface Profile {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  profile_image: string | null;
  accent_color: string;
  theme: 'dark' | 'light' | 'glass';
  website_url: string | null;
  youtube_url: string | null;
  featured_video_url?: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  x_url: string | null;
  threads_url: string | null;
  custom_social_links?: Array<{ platform: string; url: string }> | null;
  seo_title: string | null;
  seo_description: string | null;
  status: ProfileStatus;
  display_order?: number;
  views_count?: number;
  device_breakdown?: Record<string, number>;
  country_breakdown?: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  profile_id: string;
  title: string;
  article_url: string;
  canonical_url: string;
  website_name: string;
  thumbnail: string | null;
  description: string | null;
  display_order: number;
  status: ArticleStatus;
  clicks_count?: number;
  device_breakdown?: Record<string, number>;
  country_breakdown?: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface ArticleSubmission {
  id: string;
  profile_id: string;
  article_url: string;
  canonical_url: string;
  website_name: string | null;
  title: string | null;
  thumbnail: string | null;
  description: string | null;
  notes: string | null;
  status: SubmissionStatus;
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsEvent {
  id: string;
  profile_id: string;
  article_id: string | null;
  event_type: AnalyticsEventType;
  visitor_hash: string | null;
  country: string | null;
  device: string | null;
  referrer: string | null;
  created_at: string;
}

export interface DailyTrafficStat {
  id: string;
  profile_id: string;
  date: string;
  views_count: number;
  clicks_count: number;
  device_breakdown?: Record<string, number>;
  country_breakdown?: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: string;
  email: string;
  role: 'superadmin' | 'admin';
  created_at: string;
}

export interface ExtractedMetadata {
  url: string;
  canonicalUrl: string;
  title: string;
  description: string;
  websiteName: string;
  thumbnail: string;
  favicon: string;
}
