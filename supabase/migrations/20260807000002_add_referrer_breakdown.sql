-- Migration: Add referrer_breakdown to daily_traffic_stats and update RPC function
ALTER TABLE public.daily_traffic_stats ADD COLUMN IF NOT EXISTS referrer_breakdown JSONB DEFAULT '{}'::jsonb;

-- Update increment_daily_profile_view RPC to track referrer platform
CREATE OR REPLACE FUNCTION increment_daily_profile_view(
    p_profile_id UUID,
    p_date DATE,
    p_device TEXT,
    p_country TEXT,
    p_referrer TEXT DEFAULT 'Direct Link'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.daily_traffic_stats (profile_id, date, views_count, device_breakdown, country_breakdown, referrer_breakdown)
    VALUES (
        p_profile_id,
        p_date,
        1,
        jsonb_build_object(p_device, 1),
        jsonb_build_object(p_country, 1),
        jsonb_build_object(p_referrer, 1)
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
        referrer_breakdown = jsonb_set(
            COALESCE(daily_traffic_stats.referrer_breakdown, '{}'::jsonb),
            ARRAY[p_referrer],
            to_jsonb(COALESCE((daily_traffic_stats.referrer_breakdown->>p_referrer)::int, 0) + 1)
        ),
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
