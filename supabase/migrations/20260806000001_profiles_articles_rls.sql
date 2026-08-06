-- Migration: 20260806000001_profiles_articles_rls.sql
-- Description: Setup RLS policies for profiles, articles, and article_submissions tables in Supabase

-- 1. PROFILES TABLE
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles read access" ON public.profiles;
DROP POLICY IF EXISTS "Full access for authenticated admins" ON public.profiles;

CREATE POLICY "Public profiles read access" ON public.profiles
    FOR SELECT
    USING (true);

CREATE POLICY "Full access for authenticated admins" ON public.profiles
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 2. ARTICLES TABLE
ALTER TABLE IF EXISTS public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public articles read access" ON public.articles;
DROP POLICY IF EXISTS "Full access for authenticated admins" ON public.articles;

CREATE POLICY "Public articles read access" ON public.articles
    FOR SELECT
    USING (true);

CREATE POLICY "Full access for authenticated admins" ON public.articles
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. ARTICLE SUBMISSIONS TABLE
ALTER TABLE IF EXISTS public.article_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public submissions insert access" ON public.article_submissions;
DROP POLICY IF EXISTS "Full access for authenticated admins" ON public.article_submissions;

CREATE POLICY "Public submissions insert access" ON public.article_submissions
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Full access for authenticated admins" ON public.article_submissions
    FOR ALL
    USING (true)
    WITH CHECK (true);
