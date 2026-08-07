-- Migration: 20260807000005_cleanup_localhost_analytics.sql
-- Description: Clean up existing localhost test views and recalibrate profile views_count to reflect genuine external fan traffic

-- 1. Delete all localhost test events from analytics_events table
DELETE FROM public.analytics_events
WHERE referrer ILIKE '%localhost%' 
   OR referrer ILIKE '%127.0.0.1%' 
   OR referrer ILIKE '%::1%';

-- 2. Strip 'localhost', 'Localhost', and '127.0.0.1' keys from daily_traffic_stats.referrer_breakdown
UPDATE public.daily_traffic_stats
SET referrer_breakdown = (referrer_breakdown - 'localhost' - '127.0.0.1' - 'Localhost')
WHERE referrer_breakdown ? 'localhost' 
   OR referrer_breakdown ? '127.0.0.1' 
   OR referrer_breakdown ? 'Localhost';

-- 3. Recalculate daily_traffic_stats.views_count based on non-localhost referrer counts
UPDATE public.daily_traffic_stats
SET views_count = COALESCE((
  SELECT SUM((val)::int)
  FROM jsonb_each_text(referrer_breakdown) AS t(key, val)
), views_count)
WHERE referrer_breakdown IS NOT NULL AND jsonb_typeof(referrer_breakdown) = 'object';

-- 4. Recalculate profiles.views_count based on clean sum of non-localhost daily_traffic_stats
UPDATE public.profiles p
SET views_count = COALESCE((
  SELECT SUM(d.views_count)
  FROM public.daily_traffic_stats d
  WHERE d.profile_id = p.id
), 0);
