import fs from 'fs';
import path from 'path';

const jsonPath = path.join(process.cwd(), 'supabase', 'backup_restored.json');
const sqlOutputPath = path.join(process.cwd(), 'supabase', 'import_restored_data.sql');

const raw = fs.readFileSync(jsonPath, 'utf8');
const data = JSON.parse(raw);

function sqlEscape(str) {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'boolean') return str ? 'TRUE' : 'FALSE';
  if (typeof str === 'number') return str;
  if (typeof str === 'object') return `'${JSON.stringify(str).replace(/'/g, "''")}'::jsonb`;
  return `'${String(str).replace(/'/g, "''")}'`;
}

let sql = `-- SB19 Streaming Hub Data Import Script
-- Run this in your NEW Supabase SQL Editor after executing schema.sql

BEGIN;

-- 1. IMPORT PROFILES
`;

if (Array.isArray(data.profiles) && data.profiles.length > 0) {
  for (const p of data.profiles) {
    sql += `INSERT INTO public.profiles (
  id, title, slug, description, cover_image, profile_image, accent_color, theme,
  website_url, youtube_url, facebook_url, instagram_url, x_url, threads_url,
  seo_title, seo_description, status, created_at, updated_at, views_count,
  device_breakdown, country_breakdown, featured_video_url, custom_social_links, display_order, profile_type
) VALUES (
  ${sqlEscape(p.id)}, ${sqlEscape(p.title)}, ${sqlEscape(p.slug)}, ${sqlEscape(p.description)}, ${sqlEscape(p.cover_image)}, ${sqlEscape(p.profile_image)}, ${sqlEscape(p.accent_color)}, ${sqlEscape(p.theme)},
  ${sqlEscape(p.website_url)}, ${sqlEscape(p.youtube_url)}, ${sqlEscape(p.facebook_url)}, ${sqlEscape(p.instagram_url)}, ${sqlEscape(p.x_url)}, ${sqlEscape(p.threads_url)},
  ${sqlEscape(p.seo_title)}, ${sqlEscape(p.seo_description)}, ${sqlEscape(p.status)}, ${sqlEscape(p.created_at)}, ${sqlEscape(p.updated_at)}, ${sqlEscape(p.views_count || 0)},
  ${sqlEscape(p.device_breakdown || {})}, ${sqlEscape(p.country_breakdown || {})}, ${sqlEscape(p.featured_video_url)}, ${sqlEscape(p.custom_social_links)}, ${sqlEscape(p.display_order || 1)}, ${sqlEscape(p.profile_type || 'embed')}
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  cover_image = EXCLUDED.cover_image,
  profile_image = EXCLUDED.profile_image,
  accent_color = EXCLUDED.accent_color,
  theme = EXCLUDED.theme,
  youtube_url = EXCLUDED.youtube_url,
  facebook_url = EXCLUDED.facebook_url,
  instagram_url = EXCLUDED.instagram_url,
  x_url = EXCLUDED.x_url,
  threads_url = EXCLUDED.threads_url,
  seo_title = EXCLUDED.seo_title,
  status = EXCLUDED.status,
  views_count = EXCLUDED.views_count,
  featured_video_url = EXCLUDED.featured_video_url,
  display_order = EXCLUDED.display_order,
  profile_type = EXCLUDED.profile_type;\n\n`;
  }
}

sql += `-- 2. IMPORT ARTICLES\n`;

if (Array.isArray(data.articles) && data.articles.length > 0) {
  for (const a of data.articles) {
    sql += `INSERT INTO public.articles (
  id, profile_id, title, article_url, canonical_url, website_name, thumbnail,
  description, display_order, status, created_at, updated_at, clicks_count,
  device_breakdown, country_breakdown, highlight_quote
) VALUES (
  ${sqlEscape(a.id)}, ${sqlEscape(a.profile_id)}, ${sqlEscape(a.title)}, ${sqlEscape(a.article_url)}, ${sqlEscape(a.canonical_url)}, ${sqlEscape(a.website_name)}, ${sqlEscape(a.thumbnail)},
  ${sqlEscape(a.description)}, ${sqlEscape(a.display_order || 0)}, ${sqlEscape(a.status)}, ${sqlEscape(a.created_at)}, ${sqlEscape(a.updated_at)}, ${sqlEscape(a.clicks_count || 0)},
  ${sqlEscape(a.device_breakdown || {})}, ${sqlEscape(a.country_breakdown || {})}, ${sqlEscape(a.highlight_quote)}
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  article_url = EXCLUDED.article_url,
  canonical_url = EXCLUDED.canonical_url,
  website_name = EXCLUDED.website_name,
  thumbnail = EXCLUDED.thumbnail,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  status = EXCLUDED.status,
  clicks_count = EXCLUDED.clicks_count;\n\n`;
  }
}

sql += `COMMIT;\n`;

fs.writeFileSync(sqlOutputPath, sql, 'utf8');
console.log('✅ Generated SQL import script at:', sqlOutputPath);
