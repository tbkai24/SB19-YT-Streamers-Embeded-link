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
    INSERT INTO public.daily_traffic_stats (profile_id, date, clicks_count, device_breakdown, country_breakdown)
    VALUES (
        p_profile_id,
        p_date,
        1,
        jsonb_build_object(p_device, 1),
        jsonb_build_object(p_country, 1)
    )
    ON CONFLICT (profile_id, date) DO UPDATE SET
        clicks_count = daily_traffic_stats.clicks_count + 1,
        device_breakdown = jsonb_set(
            daily_traffic_stats.device_breakdown,
            ARRAY[p_device],
            to_jsonb(COALESCE((daily_traffic_stats.device_breakdown->>p_device)::int, 0) + 1)
        ),
        country_breakdown = jsonb_set(
            daily_traffic_stats.country_breakdown,
            ARRAY[p_country],
            to_jsonb(COALESCE((daily_traffic_stats.country_breakdown->>p_country)::int, 0) + 1)
        ),
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

## 📱 PWA Reusability Guide for Future Projects

When building future Web Apps or PWAs:
1. Include `SOLUTION_SUMMARY.md` in your project reference directory.
2. Use PostgreSQL RPC functions (`.rpc()`) for any counter/like/view/click action to guarantee zero race conditions.
3. Protect all public submission API routes with Cloudflare Turnstile verification.
4. Always log raw event timestamps (`TIMESTAMPTZ`) alongside daily rollup stats (`DATE`) to allow both fast daily aggregation and precise date-range filtering.
