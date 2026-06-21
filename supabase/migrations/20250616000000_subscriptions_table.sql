-- This migration documents SQL that was originally run manually in the Supabase SQL
-- Editor during development. It is safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE /
-- cron.schedule's built-in upsert behavior) and is included here so the schema is fully
-- reproducible from this repo.

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  tier text default 'trial',
  status text default 'active',
  current_period_end timestamptz,
  venue_limit int default 1,
  scan_limit int default 999999,
  scans_used_this_month int default 0,
  scans_reset_at timestamptz default now(),
  trial_ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "own subscription" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.subscriptions (
    user_id, tier, venue_limit, scan_limit,
    scans_used_this_month, status, trial_ends_at
  )
  VALUES (
    NEW.id, 'trial', 1, 999999,
    0, 'active', now() + interval '7 days'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
