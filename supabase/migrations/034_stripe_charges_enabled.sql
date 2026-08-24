-- Add charges_enabled and payouts_enabled columns to operators
-- These are synced from Stripe via webhooks and the /api/stripe/connect/verify route.
-- charges_enabled = true means the Stripe Express account is fully approved and can accept payments.
ALTER TABLE operators ADD COLUMN IF NOT EXISTS charges_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS payouts_enabled BOOLEAN NOT NULL DEFAULT false;

-- Backfill: any operator with stripe_connect_status = 'active' is implicitly charges_enabled
UPDATE operators SET charges_enabled = true WHERE stripe_connect_status = 'active';
