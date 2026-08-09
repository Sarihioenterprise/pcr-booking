-- PCR Booking Tier 3A: Add-ons & Insurance
-- Migration 018
-- Date: 2026-08-08
-- Apply via: Supabase Dashboard > SQL Editor
-- REQUIRED before Tier 3A features are fully active. App degrades gracefully without it.

-- ============================================================
-- 1. ADDONS TABLE
--    Operator-configured add-ons (insurance, extras)
-- ============================================================

CREATE TABLE IF NOT EXISTS addons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id   UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  pricing_type  TEXT NOT NULL DEFAULT 'flat' CHECK (pricing_type IN ('per_day', 'flat')),
  price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  category      TEXT NOT NULL DEFAULT 'extra' CHECK (category IN ('insurance', 'extra')),
  required      BOOLEAN NOT NULL DEFAULT false,
  active        BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast operator-scoped lookups
CREATE INDEX IF NOT EXISTS addons_operator_id_idx
  ON addons(operator_id)
  WHERE active = true;

-- ============================================================
-- 2. ROW LEVEL SECURITY
--    Mirror the pattern used by vehicles and bookings:
--    operators can manage their own rows; public reads are
--    handled by service role (admin client) in API routes.
-- ============================================================

ALTER TABLE addons ENABLE ROW LEVEL SECURITY;

-- Operators can SELECT their own add-ons
CREATE POLICY IF NOT EXISTS "operators_select_own_addons"
  ON addons FOR SELECT
  TO authenticated
  USING (
    operator_id IN (
      SELECT id FROM operators WHERE user_id = auth.uid()
    )
  );

-- Operators can INSERT their own add-ons
CREATE POLICY IF NOT EXISTS "operators_insert_own_addons"
  ON addons FOR INSERT
  TO authenticated
  WITH CHECK (
    operator_id IN (
      SELECT id FROM operators WHERE user_id = auth.uid()
    )
  );

-- Operators can UPDATE their own add-ons
CREATE POLICY IF NOT EXISTS "operators_update_own_addons"
  ON addons FOR UPDATE
  TO authenticated
  USING (
    operator_id IN (
      SELECT id FROM operators WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    operator_id IN (
      SELECT id FROM operators WHERE user_id = auth.uid()
    )
  );

-- Operators can DELETE their own add-ons
CREATE POLICY IF NOT EXISTS "operators_delete_own_addons"
  ON addons FOR DELETE
  TO authenticated
  USING (
    operator_id IN (
      SELECT id FROM operators WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. ADD ADDONS SNAPSHOT COLUMNS TO LEADS + BOOKINGS
--    Snapshot approach: store the selected add-ons at time of
--    booking as JSONB so historical accuracy is preserved even
--    if prices change later. Also store computed addons_total.
--
--    Each item in the array: {
--      id, name, description, pricing_type, price,
--      category, required, days, amount
--    }
-- ============================================================

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS addons       JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS addons_total NUMERIC(10,2) DEFAULT 0;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS addons       JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS addons_total NUMERIC(10,2) DEFAULT 0;

-- ============================================================
-- 4. VERIFICATION QUERY (run after applying)
-- ============================================================

SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE (
    table_name = 'addons'
  OR (table_name IN ('leads', 'bookings') AND column_name IN ('addons', 'addons_total'))
)
ORDER BY table_name, column_name;
