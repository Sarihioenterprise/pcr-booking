-- ===========================================================
-- 027_payment_request_tokens.sql — Payment Request Links
-- Date: 2026-08-20
-- Apply via: Supabase Dashboard > SQL Editor
-- SAFE to re-run (all statements are idempotent)
-- ===========================================================

-- ─── PAYMENT_REQUESTS: table for "Request Payment" feature ────────────────
CREATE TABLE IF NOT EXISTS payment_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id               UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  operator_id              UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  token                    TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  label                    TEXT NOT NULL DEFAULT 'Rental Payment',
  amount_cents             INTEGER NOT NULL,       -- amount in cents (e.g. 50000 = $500.00)
  currency                 TEXT NOT NULL DEFAULT 'usd',
  status                   TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'paid', 'cancelled', 'expired')),
  stripe_payment_intent_id TEXT,
  stripe_client_secret     TEXT,                  -- temporary, cleared after use
  notes                    TEXT,                  -- operator-visible notes
  expires_at               TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '72 hours'),
  paid_at                  TIMESTAMPTZ,
  payer_email              TEXT,                  -- email of who paid (if captured)
  payer_ip                 TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_requests_booking_id_idx ON payment_requests(booking_id);
CREATE INDEX IF NOT EXISTS payment_requests_operator_id_idx ON payment_requests(operator_id);
CREATE UNIQUE INDEX IF NOT EXISTS payment_requests_token_idx ON payment_requests(token);

-- RLS for payment_requests (operators see their own only)
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payment_requests'
      AND policyname = 'operators_select_own_payment_requests'
  ) THEN
    CREATE POLICY "operators_select_own_payment_requests"
      ON payment_requests FOR SELECT TO authenticated
      USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payment_requests'
      AND policyname = 'operators_insert_own_payment_requests'
  ) THEN
    CREATE POLICY "operators_insert_own_payment_requests"
      ON payment_requests FOR INSERT TO authenticated
      WITH CHECK (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'payment_requests'
      AND policyname = 'operators_update_own_payment_requests'
  ) THEN
    CREATE POLICY "operators_update_own_payment_requests"
      ON payment_requests FOR UPDATE TO authenticated
      USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
  END IF;
END $$;

-- ─── VERIFICATION QUERY ────────────────────────────────────────────────────
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'payment_requests'
ORDER BY ordinal_position;
