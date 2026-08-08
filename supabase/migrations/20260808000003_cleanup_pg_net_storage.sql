-- Migration: Instant Cleanup & Auto-Purge for pg_net (_http_response) storage bloat
-- Run this in Supabase SQL Editor to immediately free up database storage space!

-- 1. Immediately wipe all cached HTTP response logs to free up storage space instantly
TRUNCATE TABLE net._http_response;

-- 2. Immediately wipe all old pg_cron execution run details to reclaim storage
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    TRUNCATE TABLE cron.job_run_details;
  END IF;
END $do$;

-- 3. Clear duplicate/unused cleanup crons and set 1 unified nightly maintenance job
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname LIKE '%purge%' OR jobname LIKE '%cleanup%' OR jobname LIKE '%maintenance%';

    PERFORM cron.schedule(
      'daily-supabase-storage-maintenance',
      '0 0 * * *',
      'TRUNCATE TABLE net._http_response; DELETE FROM cron.job_run_details WHERE start_time < NOW() - INTERVAL ''1 day'';'
    );
  END IF;
END $do$;
