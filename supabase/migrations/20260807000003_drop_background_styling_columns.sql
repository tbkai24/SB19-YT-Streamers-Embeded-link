-- Migration: Drop background_color and background_pattern columns from public.profiles table

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS background_color,
DROP COLUMN IF EXISTS background_pattern;
