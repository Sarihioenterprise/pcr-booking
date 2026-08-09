-- ============================================================
-- 020_deposits.sql — Deposit Lifecycle: Hold + Capture + Late Fees
-- PCR Booking Tier 3C
-- Date: 2026-08-08
-- Apply via: Supabase Dashboard > SQL Editor
-- SAFE to re-run (all statements are idempotent via IF NOT EXISTS / DO blocks).
-- App degrades gracefully if this migration has NOT been applied.
-- ============================================================

-- ============================================================
-- 1. BOOKINGS — new deposit lifecycle columns
-- ============================================================

ALTER TABLE bookings
  -- Token for secure public deposit link (emailed to renter)
  ADD COLUMN IF NOT EXISTS deposit_token              TEXT,
  -- Amount actually captured from deposit (may be less than deposit_amount)
  ADD COLUMN IF NOT EXISTS deposit_captured_amount    NUMERIC(10,2),
  -- Timestamp: renter authorized the hold
  ADD COLUMN IF NOT EXISTS deposit_authorized_at      TIMESTAMPTZ,
  -- Timestamp: operator captured funds
  ADD COLUMN IF NOT EXISTS deposit_captured_at        TIMESTAMPTZ,
  -- Timestamp: hold released / PI cancelled
  ADD COLUMN IF NOT EXISTS deposit_released_at        TIMESTAMPTZ,
  -- Late fee amount at time of capture (informational)
  ADD COLUMN IF NOT EXISTS late_fee_amount            NUMERIC(10,2),
  -- Reason provided by operator when capturing partial amount
  ADD COLUMN IF NOT EXISTS deposit_capture_reason     TEXT;

-- Unique index for token lookups (deposit page uses this)
CREATE UNIQUE INDEX IF NOT EXISTS bookings_deposit_token_idx
  ON bookings(deposit_token)
  WHERE deposit_token IS NOT NULL;

-- ============================================================
-- 2. BOOKINGS — expand deposit_status enum values
-- ============================================================
-- Existing constraint may only allow: none, held, released, claimed
-- We now need: none, pending_auth, held, captured, partially_captured, released, expired, claimed
-- Strategy: drop old CHECK, add new one. If no CHECK existed, no-op on drop.
DO $$
BEGIN
  ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_deposit_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE bookings
    ADD CONSTRAINT bookings_deposit_status_check
    CHECK (deposit_status IN (
      'none', 'pending_auth', 'held', 'captured',
      'partially_captured', 'released', 'expired', 'claimed'
    ));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- 3. OPERATORS — late fee settings
-- ============================================================

ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS late_fee_per_day  NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_fee_enabled  BOOLEAN DEFAULT false;

-- ============================================================
-- 4. VERIFICATION QUERY (run after applying)
-- ============================================================

SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE (
    table_name = 'bookings'
    AND column_name IN (
      'deposit_token', 'deposit_captured_amount', 'deposit_authorized_at',
      'deposit_captured_at', 'deposit_released_at', 'late_fee_amount',
      'deposit_capture_reason'
    )
  ) OR (
    table_name = 'operators'
    AND column_name IN ('late_fee_per_day', 'late_fee_enabled')
  )
ORDER BY table_name, column_name;
