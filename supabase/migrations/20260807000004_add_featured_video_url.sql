-- Migration: Add featured_video_url column to public.profiles table

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS featured_video_url TEXT;
