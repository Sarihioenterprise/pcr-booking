-- ===========================================================
-- 028_no_show.sql — No-Show Tracking columns
-- Date: 2026-08-20
-- Apply via: Supabase Dashboard > SQL Editor
-- SAFE to re-run (all statements use IF NOT EXISTS)
-- Note: These columns are also in 026_sprint1.sql.
--       This migration is idempotent — safe to run even if
--       026 was already applied.
-- ===========================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS is_no_show         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_show_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_reason     TEXT,
  ADD COLUMN IF NOT EXISTS no_show_sms_sent   BOOLEAN NOT NULL DEFAULT false;

-- Index for dashboard filter
CREATE INDEX IF NOT EXISTS bookings_is_no_show_idx ON bookings(is_no_show) WHERE is_no_show = true;

-- Verification
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name IN ('is_no_show', 'no_show_at', 'no_show_reason', 'no_show_sms_sent')
ORDER BY column_name;
