-- 026_inspection_flags.sql
-- Adds 4-zone photo inspection flags to bookings table.
-- Each booking can have a pickup inspection and a return inspection,
-- each capturing photos of 4 vehicle zones (front, back, left, right).

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pickup_inspected        BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS return_inspected        BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pickup_inspected_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS return_inspected_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_photos           JSONB       DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS return_photos           JSONB       DEFAULT '{}'::jsonb;

COMMENT ON COLUMN bookings.pickup_inspected        IS 'True when all 4-zone pickup photos have been captured and confirmed.';
COMMENT ON COLUMN bookings.return_inspected        IS 'True when all 4-zone return photos have been captured and confirmed.';
COMMENT ON COLUMN bookings.pickup_inspected_at     IS 'UTC timestamp when pickup inspection was marked complete.';
COMMENT ON COLUMN bookings.return_inspected_at     IS 'UTC timestamp when return inspection was marked complete.';
COMMENT ON COLUMN bookings.pickup_photos           IS 'JSONB map of zone → storage path for pickup photos. Keys: front, back, left, right.';
COMMENT ON COLUMN bookings.return_photos           IS 'JSONB map of zone → storage path for return photos. Keys: front, back, left, right.';
