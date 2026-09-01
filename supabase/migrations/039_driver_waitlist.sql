-- Driver waitlist for fully-booked vehicles
CREATE TABLE vehicle_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  renter_name TEXT NOT NULL,
  renter_email TEXT,
  renter_phone TEXT,
  notes TEXT,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'booked', 'removed')),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one entry per position per vehicle while waiting
CREATE UNIQUE INDEX vehicle_waitlist_position_unique
  ON vehicle_waitlist (vehicle_id, position)
  WHERE status = 'waiting';

-- RLS
ALTER TABLE vehicle_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operators_manage_own_waitlist"
  ON vehicle_waitlist
  FOR ALL
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
