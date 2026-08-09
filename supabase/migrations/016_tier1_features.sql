-- PCR Booking Tier 1 Schema Migration
-- Date: 2026-08-09
-- Apply via: Supabase Dashboard > SQL Editor

-- 1. Driver's License Upload: add license_file_path to leads table
--    (public booking page stores license path here when submitted)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS license_file_path TEXT;

-- 2. Booking Lifecycle Reminders: track which reminders have been sent
--    Used by /api/cron/reminders for idempotency (no double-sends)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_pickup BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_return BOOLEAN DEFAULT FALSE;

-- 3. Operator notification preferences (Settings > Notifications tab)
ALTER TABLE operators ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}'::jsonb;

-- Verify
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('leads', 'bookings')
  AND column_name IN (
    'license_file_path',
    'reminder_sent_pickup',
    'reminder_sent_return'
  )
ORDER BY table_name, column_name;
