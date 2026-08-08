-- Migration: Add display_order column to profiles table for profile reordering
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 1;

-- Initialize LAWLESS as #1 top release, EMOJI as #2, and VISA as #3
UPDATE public.profiles SET display_order = 1 WHERE slug ILIKE '%lawless%';
UPDATE public.profiles SET display_order = 2 WHERE slug ILIKE '%emoji%';
UPDATE public.profiles SET display_order = 3 WHERE slug ILIKE '%visa%';
