ALTER TABLE operators ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'not_connected';
