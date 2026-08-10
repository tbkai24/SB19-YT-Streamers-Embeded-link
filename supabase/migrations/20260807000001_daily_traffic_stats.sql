-- Migration: Daily Traffic Rollup Stats Table & Atomic RPC Functions
CREATE TABLE IF NOT EXISTS public.daily_traffic_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    views_count INT DEFAULT 0,
    clicks_count INT DEFAULT 0,
    device_breakdown JSONB DEFAULT '{"mobile": 0, "desktop": 0, "tablet": 0}'::jsonb,
    country_breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(profile_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_traffic_profile_date ON public.daily_traffic_stats(profile_id, date);

-- Enable RLS
ALTER TABLE public.daily_traffic_stats ENABLE ROW LEVEL SECURITY;

-- Public insert/select policies
CREATE POLICY "Public can select daily traffic stats" ON public.daily_traffic_stats FOR SELECT USING (true);
CREATE POLICY "Public can insert daily traffic stats" ON public.daily_traffic_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins have full access to daily traffic stats" ON public.daily_traffic_stats FOR ALL USING (auth.role() = 'authenticated');

-- Atomic SQL function to increment profile view on a specific date
CREATE OR REPLACE FUNCTION increment_daily_profile_view(
    p_profile_id UUID,
    p_date DATE,
    p_device TEXT,
    p_country TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.daily_traffic_stats (profile_id, date, views_count, device_breakdown, country_breakdown)
    VALUES (
        p_profile_id,
        p_date,
        1,
        jsonb_build_object(p_device, 1),
        jsonb_build_object(p_country, 1)
    )
    ON CONFLICT (profile_id, date) DO UPDATE SET
        views_count = daily_traffic_stats.views_count + 1,
        device_breakdown = jsonb_set(
            daily_traffic_stats.device_breakdown,
            ARRAY[p_device],
            to_jsonb(COALESCE((daily_traffic_stats.device_breakdown->>p_device)::int, 0) + 1)
        ),
        country_breakdown = jsonb_set(
            daily_traffic_stats.country_breakdown,
            ARRAY[p_country],
            to_jsonb(COALESCE((daily_traffic_stats.country_breakdown->>p_country)::int, 0) + 1)
        ),
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic SQL function to increment article click on a specific date
CREATE OR REPLACE FUNCTION increment_daily_article_click(
    p_profile_id UUID,
    p_date DATE,
    p_device TEXT,
    p_country TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.daily_traffic_stats (profile_id, date, clicks_count)
    VALUES (
        p_profile_id,
        p_date,
        1
    )
    ON CONFLICT (profile_id, date) DO UPDATE SET
        clicks_count = daily_traffic_stats.clicks_count + 1,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
