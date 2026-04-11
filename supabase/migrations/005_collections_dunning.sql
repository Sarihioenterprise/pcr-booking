-- Collections & Dunning Migration
-- Adds dunning columns to payment_schedule and creates dunning_log table

-- ============================================================
-- ALTER payment_schedule
-- ============================================================

ALTER TABLE payment_schedule
  ADD COLUMN IF NOT EXISTS late_fee_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_fee_applied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dunning_stage TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS pay_link TEXT;

-- Add check constraint for dunning_stage
ALTER TABLE payment_schedule
  DROP CONSTRAINT IF EXISTS payment_schedule_dunning_stage_check;

ALTER TABLE payment_schedule
  ADD CONSTRAINT payment_schedule_dunning_stage_check
  CHECK (dunning_stage IN ('none', 'reminder_1', 'reminder_2', 'reminder_3', 'final', 'collections'));

-- ============================================================
-- CREATE dunning_log
-- ============================================================

CREATE TABLE IF NOT EXISTS dunning_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_schedule_id UUID REFERENCES payment_schedule(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES operators(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  channel TEXT CHECK (channel IN ('sms', 'email')),
  message_sent TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_dunning_log_payment_schedule ON dunning_log(payment_schedule_id);
CREATE INDEX IF NOT EXISTS idx_dunning_log_operator ON dunning_log(operator_id);
CREATE INDEX IF NOT EXISTS idx_dunning_log_booking ON dunning_log(booking_id);

-- ============================================================
-- RLS for dunning_log
-- ============================================================

ALTER TABLE dunning_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can select their dunning logs"
  ON dunning_log FOR SELECT
  USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));

CREATE POLICY "Operators can insert their dunning logs"
  ON dunning_log FOR INSERT
  WITH CHECK (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
