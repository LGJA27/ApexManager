-- This migration documents SQL that was originally run manually in the Supabase SQL
-- Editor during development. It is safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE /
-- cron.schedule's built-in upsert behavior) and is included here so the schema is fully
-- reproducible from this repo.

-- Requires pg_cron extension (enable via Supabase Dashboard →
-- Database → Extensions, or: CREATE EXTENSION IF NOT EXISTS pg_cron;)

-- Monthly reset of AI scan usage counters
SELECT cron.schedule(
  'reset-monthly-scans',
  '0 0 1 * *',
  $$
    UPDATE public.subscriptions
    SET scans_used_this_month = 0, scans_reset_at = now()
    WHERE status = 'active';
  $$
);

-- Hourly check to expire trials into the free tier
SELECT cron.schedule(
  'expire-trials',
  '0 * * * *',
  $$
    UPDATE public.subscriptions
    SET tier = 'free', venue_limit = 1, scan_limit = 0, trial_ends_at = NULL
    WHERE tier = 'trial' AND trial_ends_at IS NOT NULL AND trial_ends_at < now();
  $$
);
