-- 029_quotes.sql
-- Quotes system: operators send quotes to potential customers before they commit.
-- Customers get a public link, view pricing breakdown, and can accept to convert to booking.

CREATE TABLE IF NOT EXISTS quotes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id         UUID        NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  renter_id           UUID        REFERENCES renters(id) ON DELETE SET NULL,
  vehicle_id          UUID        REFERENCES vehicles(id) ON DELETE SET NULL,

  -- Customer contact (may not be a renter yet at quote time)
  customer_name       TEXT,
  customer_email      TEXT,
  customer_phone      TEXT,

  -- Rental period
  pickup_date         DATE        NOT NULL,
  return_date         DATE        NOT NULL,
  duration_days       INT         NOT NULL DEFAULT 1,

  -- Pricing
  base_total          NUMERIC(10,2) NOT NULL DEFAULT 0,
  addon_total         NUMERIC(10,2) NOT NULL DEFAULT 0,
  total               NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Add-ons (array of addon IDs + snapshot of pricing at quote time)
  addon_ids           UUID[]      NOT NULL DEFAULT '{}',
  addons_snapshot     JSONB       NOT NULL DEFAULT '[]',

  -- Status lifecycle: draft → pending (saved) → sent → accepted/declined/expired
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('draft', 'pending', 'sent', 'accepted', 'declined', 'expired')),

  notes               TEXT,

  -- Public accept token — customer clicks link to accept
  accept_token        TEXT        UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,

  -- Timestamps
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  sent_at             TIMESTAMPTZ,
  accepted_at         TIMESTAMPTZ,
  declined_at         TIMESTAMPTZ,

  -- If accepted, link to the resulting booking
  created_booking_id  UUID        REFERENCES bookings(id) ON DELETE SET NULL,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quotes_operator_id  ON quotes(operator_id);
CREATE INDEX IF NOT EXISTS idx_quotes_renter_id    ON quotes(renter_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status       ON quotes(operator_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_accept_token ON quotes(accept_token);
CREATE INDEX IF NOT EXISTS idx_quotes_vehicle_id   ON quotes(vehicle_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION quotes_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quotes_updated_at ON quotes;
CREATE TRIGGER quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION quotes_set_updated_at();
