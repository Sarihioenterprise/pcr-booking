-- ============================================================
-- Migration 031: Vehicle Maintenance Log enhancements
-- ============================================================
-- The core maintenance_records table was created in 002.
-- This migration adds:
--   1. Indexes to support efficient per-vehicle overdue queries
--   2. Ensures columns used by the new maintenance UI exist
--      (idempotent ALTER TABLE ... ADD COLUMN IF NOT EXISTS)
--   3. Self check-in columns on bookings table
-- ============================================================

-- ── maintenance_records: ensure key columns exist ────────────────────────────

-- date_due is used as "next_service_date"
ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS date_due DATE;

-- mileage_due is used as "next_service_odometer"
ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS mileage_due INTEGER;

-- date_performed is the actual service date
ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS date_performed DATE;

-- mileage_at_service is the odometer reading at service
ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS mileage_at_service INTEGER;

-- vendor
ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS vendor TEXT;

-- notes
ALTER TABLE maintenance_records
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── Indexes for overdue query (date_due < today AND status != completed) ──────

CREATE INDEX IF NOT EXISTS idx_maintenance_date_due
  ON maintenance_records (operator_id, date_due)
  WHERE status != 'completed' AND date_due IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_operator
  ON maintenance_records (vehicle_id, operator_id);

-- ── bookings: self check-in columns ──────────────────────────────────────────

-- When renter completed self check-in
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Condition notes captured at check-in
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS checkin_notes TEXT;

-- JSON object with zone photo URLs: { "Front": "url", "Rear": "url", ... }
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS checkin_photos JSONB;

-- access_token for token-gated portal links (referenced in portal-auth.ts TODO)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS access_token TEXT;

-- Partial index for fast portal token lookups
CREATE INDEX IF NOT EXISTS idx_bookings_access_token
  ON bookings (access_token)
  WHERE access_token IS NOT NULL;

-- ── Trigger: auto-update updated_at on maintenance_records ───────────────────

-- Ensure the update trigger exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_maintenance_records_updated_at'
  ) THEN
    CREATE TRIGGER update_maintenance_records_updated_at
      BEFORE UPDATE ON maintenance_records
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END;
$$;
