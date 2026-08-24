-- Migration 031: Deliveries / Pickup scheduling
-- Tracks delivery and pickup tasks linked to bookings

CREATE TYPE delivery_type AS ENUM ('delivery', 'pickup');
CREATE TYPE delivery_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS deliveries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id      UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL,
  type             delivery_type NOT NULL DEFAULT 'delivery',
  scheduled_at     TIMESTAMPTZ NOT NULL,
  address          TEXT NOT NULL,
  renter_name      TEXT,
  vehicle_label    TEXT,
  driver_name      TEXT,
  driver_phone     TEXT,
  status           delivery_status NOT NULL DEFAULT 'pending',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common queries
CREATE INDEX deliveries_operator_scheduled_idx ON deliveries(operator_id, scheduled_at);
CREATE INDEX deliveries_booking_idx ON deliveries(booking_id);

-- Row-level security
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- Operators can only see/modify their own deliveries
CREATE POLICY "Operators manage their deliveries"
  ON deliveries
  FOR ALL
  USING (operator_id = (SELECT id FROM operators WHERE user_id = auth.uid() LIMIT 1));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_deliveries_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_deliveries_updated_at();
