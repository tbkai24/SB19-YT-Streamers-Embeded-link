-- Migration: 20260806000002_truncate_all_data.sql
-- Description: Clean slate script to wipe all profiles, articles, and submissions in Supabase DB

TRUNCATE TABLE public.article_submissions CASCADE;
TRUNCATE TABLE public.articles CASCADE;
TRUNCATE TABLE public.profiles CASCADE;
