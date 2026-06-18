-- Venue read-only lockout support (run manually in Supabase SQL editor)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS last_used_at timestamptz DEFAULT now();
