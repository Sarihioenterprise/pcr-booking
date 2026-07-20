-- Communications Log Table for SMS tracking
CREATE TABLE IF NOT EXISTS renter_comms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  renter_id UUID REFERENCES renters(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL DEFAULT 'custom',
  message_body TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  twilio_sid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_renter_comms_operator ON renter_comms_log(operator_id);
CREATE INDEX IF NOT EXISTS idx_renter_comms_renter ON renter_comms_log(renter_id);
CREATE INDEX IF NOT EXISTS idx_renter_comms_booking ON renter_comms_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_renter_comms_created ON renter_comms_log(created_at);

ALTER TABLE renter_comms_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'renter_comms_log' AND policyname = 'Operators can view their own comms log') THEN
    CREATE POLICY "Operators can view their own comms log" ON renter_comms_log FOR SELECT USING (operator_id = auth.uid()::uuid);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'renter_comms_log' AND policyname = 'Operators can insert their own comms log') THEN
    CREATE POLICY "Operators can insert their own comms log" ON renter_comms_log FOR INSERT WITH CHECK (operator_id = auth.uid()::uuid);
  END IF;
END $$;
