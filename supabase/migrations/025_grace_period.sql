-- 025_grace_period.sql
-- Adds a 7-business-day grace period for public booking pages after payment failure.
--
-- Stage 1 (already live): payment fails → operator dashboard access revoked immediately
--   (implemented via stripe_subscription_id being nulled in the webhook)
--
-- Stage 2 (this migration): 7 business days after payment failure → operator's PUBLIC
--   booking page also goes dark.  The timestamp stored here is the DEADLINE, computed
--   as: failure_timestamp + 7 business days (Mon–Fri only).
--
-- NULL  = no active grace cutoff (operator is in good standing, OR they paid before
--         the deadline was reached and it was cleared)
-- SET   = a deadline is active; the public booking page checks now() > this value and
--         shows an "unavailable" message if the deadline has passed.
--
-- NOTHING is deleted.  When payment is restored, the deadline is simply cleared (set
-- back to NULL), which immediately restores both dashboard and public page access.

ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS public_grace_deadline_at TIMESTAMPTZ;

COMMENT ON COLUMN operators.public_grace_deadline_at IS
  'UTC timestamp after which the public booking page is disabled due to non-payment. '
  'NULL = page is live. SET = page goes dark once NOW() > this value. '
  'Cleared when payment is restored.';

CREATE INDEX IF NOT EXISTS idx_operators_grace_deadline
  ON operators (public_grace_deadline_at)
  WHERE public_grace_deadline_at IS NOT NULL;
