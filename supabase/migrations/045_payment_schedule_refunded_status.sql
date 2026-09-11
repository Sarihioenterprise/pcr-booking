-- Allow 'refunded' status on payment_schedule rows
-- Required for the operator refund button added in the booking detail page.
ALTER TABLE payment_schedule
  DROP CONSTRAINT IF EXISTS payment_schedule_status_check;

ALTER TABLE payment_schedule
  ADD CONSTRAINT payment_schedule_status_check
  CHECK (status IN ('pending', 'paid', 'overdue', 'failed', 'refunded'));
