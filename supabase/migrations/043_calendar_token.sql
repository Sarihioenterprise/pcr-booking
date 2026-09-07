ALTER TABLE operators ADD COLUMN IF NOT EXISTS calendar_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;
CREATE INDEX IF NOT EXISTS idx_operators_calendar_token ON operators(calendar_token);
