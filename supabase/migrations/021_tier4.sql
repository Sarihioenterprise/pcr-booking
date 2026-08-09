-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 021: Tier 4 — PCR Leads Attribution + Inspection Upgrades
-- ─────────────────────────────────────────────────────────────────────────────
-- Deploy: paste into Supabase SQL editor and run.
-- Graceful: all changes use IF NOT EXISTS / DO $$ checks.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Operator-level mileage policy settings ─────────────────────────────
-- We add these at the operator level rather than per-vehicle so that operators
-- can set a policy immediately without editing every vehicle. Per-vehicle
-- overrides can be added in a future migration if needed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operators' AND column_name = 'included_miles_per_day'
  ) THEN
    ALTER TABLE operators ADD COLUMN included_miles_per_day INTEGER DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'operators' AND column_name = 'overage_rate_per_mile'
  ) THEN
    ALTER TABLE operators ADD COLUMN overage_rate_per_mile NUMERIC(8,4) DEFAULT NULL;
  END IF;
END $$;

-- ── 2. Inspections: add photo_paths for private bucket storage ────────────
-- photo_paths stores an array of storage paths in the 'inspections' bucket.
-- Signed URLs are generated server-side on demand (same pattern as licenses).
-- The existing inspection_photos table stores public URLs; photo_paths stores
-- private paths. Both can coexist during transition.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'photo_paths'
  ) THEN
    ALTER TABLE inspections ADD COLUMN photo_paths JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- ── 3. Ensure 'pcr_leads' is a documented recognized source value ─────────
-- The leads.source column is TEXT (no enum), so no DDL change is needed.
-- This comment serves as documentation for Alton's ad campaigns:
--   ?src=pcrleads or ?utm_source=pcrleads on /book/[slug] → source='pcr_leads'
-- No schema change required; this is handled in application code.

-- ── 4. Indexes for lead source queries (dashboard analytics) ─────────────
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(operator_id, source);
CREATE INDEX IF NOT EXISTS idx_leads_created_source ON leads(operator_id, created_at, source);
