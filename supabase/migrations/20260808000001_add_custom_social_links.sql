-- Migration: 20260808000001_add_custom_social_links.sql
-- Description: Add custom_social_links JSONB column to profiles table for storing arbitrary social platforms

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_social_links JSONB DEFAULT '[]'::jsonb;
