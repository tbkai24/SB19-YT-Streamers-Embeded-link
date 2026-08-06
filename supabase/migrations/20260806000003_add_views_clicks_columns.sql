-- Migration: 20260806000003_add_views_clicks_columns.sql
-- Description: Add views_count and clicks_count columns + atomic increment RPCs to track per-link clicks and visitors with zero database storage bloat

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS clicks_count INTEGER DEFAULT 0;

-- Function to increment profile views atomically
CREATE OR REPLACE FUNCTION public.increment_profile_views(p_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles SET views_count = COALESCE(views_count, 0) + 1 WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment article clicks atomically
CREATE OR REPLACE FUNCTION public.increment_article_clicks(a_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.articles SET clicks_count = COALESCE(clicks_count, 0) + 1 WHERE id = a_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
