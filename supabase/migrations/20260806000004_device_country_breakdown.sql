-- Migration: 20260806000004_device_country_breakdown.sql
-- Description: Add device_breakdown and country_breakdown JSONB columns to profiles and articles

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_breakdown JSONB DEFAULT '{"mobile":0,"desktop":0,"tablet":0}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_breakdown JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS device_breakdown JSONB DEFAULT '{"mobile":0,"desktop":0,"tablet":0}'::jsonb;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS country_breakdown JSONB DEFAULT '{}'::jsonb;
