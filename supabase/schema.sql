-- SB19 Streaming Hub v3.0 Supabase Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    cover_image TEXT,
    profile_image TEXT,
    accent_color TEXT DEFAULT '#3b82f6',
    theme TEXT DEFAULT 'dark',
    website_url TEXT,
    youtube_url TEXT,
    facebook_url TEXT,
    instagram_url TEXT,
    x_url TEXT,
    threads_url TEXT,
    support_qr_image TEXT,
    support_title TEXT,
    support_note TEXT,
    support_qr_options JSONB,
    seo_title TEXT,
    seo_description TEXT,
    status TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ARTICLES TABLE
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    article_url TEXT NOT NULL,
    canonical_url TEXT NOT NULL,
    website_name TEXT NOT NULL,
    thumbnail TEXT,
    description TEXT,
    display_order INT DEFAULT 0,
    status TEXT DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ARTICLE SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.article_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    article_url TEXT NOT NULL,
    canonical_url TEXT NOT NULL,
    website_name TEXT,
    title TEXT,
    thumbnail TEXT,
    description TEXT,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate', 'archived')),
    submitted_by_name TEXT,
    submitted_by_email TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ANALYTICS EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('profile_view', 'article_click', 'submit_attempt')),
    visitor_hash TEXT,
    country TEXT,
    device TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ADMINS TABLE
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_profile_id ON public.articles(profile_id);
CREATE INDEX IF NOT EXISTS idx_articles_canonical_url ON public.articles(canonical_url);
CREATE INDEX IF NOT EXISTS idx_submissions_profile_id ON public.article_submissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_submissions_canonical_url ON public.article_submissions(canonical_url);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.article_submissions(status);
CREATE INDEX IF NOT EXISTS idx_analytics_profile_id ON public.analytics_events(profile_id);

-- UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.article_submissions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ POLICIES
CREATE POLICY "Public can view published profiles" ON public.profiles FOR SELECT USING (status = 'published');
CREATE POLICY "Public can view published articles" ON public.articles FOR SELECT USING (status = 'published');
CREATE POLICY "Public can insert submissions" ON public.article_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can insert analytics" ON public.analytics_events FOR INSERT WITH CHECK (true);

-- ADMIN POLICIES (Full Access for authenticated admins)
CREATE POLICY "Admins have full access to profiles" ON public.profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to articles" ON public.articles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to submissions" ON public.article_submissions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to analytics" ON public.analytics_events FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admins have full access to admins table" ON public.admins FOR ALL USING (auth.role() = 'authenticated');
