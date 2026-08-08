-- Migration: Add highlight_quote column to articles table for Article of the Day quote snippets
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS highlight_quote TEXT DEFAULT NULL;
