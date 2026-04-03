ALTER TABLE operators ADD COLUMN IF NOT EXISTS booking_slug TEXT UNIQUE;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}';
