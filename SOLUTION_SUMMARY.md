# Technical Architecture & Solution Summary

This document provides a comprehensive reusable blueprint of the solutions, database architecture, security measures, and analytics engine built for this application. You can reuse this exact architecture for future Web Applications and Progressive Web Apps (PWAs).

---

## 1. 🛡️ Cloudflare Turnstile Security & Anti-Bot Protection

### Client Widget Integration (`components/public/turnstile.tsx`)
- Renders Cloudflare Turnstile using Next.js `Script` (`strategy="afterInteractive"`).
- Uses `useRef` to maintain widget state across re-renders and prevent duplicate script loading.
- Exposes `onVerify` and `onExpire` callbacks to gate sensitive user actions.

### Server Verification Route (`app/api/verify-turnstile/route.ts`)
- Canonical server-side API endpoint POSTing to `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
- Requires both `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET`.
- Gates public submission forms (`submit-modal.tsx`) before executing metadata extraction or database writes.

---

## 2. ⚡ Atomic PostgreSQL Analytics & Data Accuracy Engine

### The Problem Solved
In high-concurrency environments or multi-visitor Web/PWA apps, client-side updates (e.g., `.update({ clicks_count: newCount })` from local storage) cause race conditions that overwrite real database counts with lower stale numbers.

### The Solution: Server-Side Atomic Stored Procedures (RPC)

#### 1. Atomic Article Click Increment (`increment_article_clicks`)
```sql
CREATE OR REPLACE FUNCTION public.increment_article_clicks(a_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.articles 
  SET clicks_count = COALESCE(clicks_count, 0) + 1 
  WHERE id = a_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2. Atomic Daily Traffic Rollup (`increment_daily_article_click`)
```sql
CREATE OR REPLACE FUNCTION increment_daily_article_click(
    p_profile_id UUID,
    p_date DATE,
    p_device TEXT,
    p_country TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.daily_traffic_stats (profile_id, date, clicks_count)
    VALUES (
        p_profile_id,
        p_date,
        1
    )
    ON CONFLICT (profile_id, date) DO UPDATE SET
        clicks_count = daily_traffic_stats.clicks_count + 1,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 3. ⏱️ Real-Time Event Tracking & Date-Range Filtering

### Raw Event Log Schema (`analytics_events`)
- **`id`**: `UUID`
- **`profile_id`**: `UUID` (Strict Workspace/Profile Isolation)
- **`article_id`**: `UUID` (Target Content Item)
- **`event_type`**: `profile_view` | `article_click` | `submit_attempt`
- **`visitor_hash`**: Anonymized client IP / visitor hash for deduplicated unique count
- **`country`**: GeoIP country code (PH, US, JP, AU, etc.)
- **`device`**: `mobile` | `desktop` | `tablet`
- **`referrer`**: Normalized platform origin (Twitter/X, Facebook, Threads, Direct Link, etc.)
- **`created_at`**: `TIMESTAMPTZ` (Exact ISO timestamp)

### Filter Mechanics (`1d`, `1w`, `1m`, `all`, `custom`)
- **`1d` (Last 24h)**: Filtered strictly to `created_at >= Date.now() - 24h` / today's date.
- **`1w` (Last 7d)**: Filtered strictly to `created_at >= Date.now() - 7d`.
- **`1m` (Last 30d)**: Filtered strictly to `created_at >= Date.now() - 30d`.
- **`all` (Lifetime)**: Lifetime total accumulated from database tables.
- **`custom`**: Filtered strictly to user-selected `startDate` and `endDate`.

---

## 4. 🎨 Responsive UI & Custom Date Range Controls

- **Layout Resilience**: Custom date picker wrapped in `flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 px-3 rounded-xl border border-slate-200 shadow-xs animate-fade-in`.
- **Bounded Inputs**: Date inputs bounded with `max-w-[130px]` to prevent browser native date-picker overflow across screen resolutions.
- **Strict Profile Isolation**: All analytical queries enforce `.eq('profile_id', activeProfile.id)` to guarantee 0% data cross-contamination between workspaces/projects.

---

## 5. 📱 PWA & Web Push Notification Architecture

### Service Worker (`public/sw.js`)
- Registered at `/sw.js` via `navigator.serviceWorker.register('/sw.js')`.
- Handles `push` event listeners, parsing JSON payloads (`title`, `message`, `url`, `id`).
- Employs strict single-notification tagging (`tag: notifTag`, `renotify: false`) to ensure exactly **1 clean notification banner** is displayed per broadcast instead of duplicate spam.
- Listens to `notificationclick` events, automatically closing the notification banner and navigating to the target URL (or focusing an existing active client window).

### Database Schema for Web Push (`supabase/migrations/20260808000005_create_notifications_tables.sql`)
1. **`push_subscriptions` Table**:
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `endpoint`: `TEXT UNIQUE NOT NULL`
   - `keys`: `JSONB` (contains VAPID `p256dh` and `auth` keys)
   - `user_agent`: `TEXT`
   - `created_at`: `TIMESTAMPTZ DEFAULT NOW()`

2. **`notifications` Table**:
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `profile_id`: `UUID REFERENCES public.profiles(id)`
   - `title`: `TEXT NOT NULL`
   - `message`: `TEXT NOT NULL`
   - `type`: `TEXT DEFAULT 'announcement'`
   - `url`: `TEXT DEFAULT '/'`
   - `status`: `TEXT DEFAULT 'sent'`
   - `sent_at`: `TIMESTAMPTZ DEFAULT NOW()`

---

## 🚀 PWA & Web App Blueprint Checklist for Future Projects

When building future Web Apps or PWAs:
1. Include `SOLUTION_SUMMARY.md` in your project root directory.
2. Use PostgreSQL RPC functions (`.rpc()`) for any counter/like/view/click action to guarantee zero client race-condition overwrites.
3. Protect public forms and endpoints with Cloudflare Turnstile anti-bot verification.
4. Use `analytics_events` with `TIMESTAMPTZ` alongside `daily_traffic_stats` with `DATE` for 100% accurate date-range filtering.
5. Register `/sw.js` service worker with VAPID web push subscriptions saved to `push_subscriptions` table for instant PWA push notification broadcasts.
