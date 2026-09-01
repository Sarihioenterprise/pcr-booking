-- Checkr background check columns for operators (Hosted Flow)
ALTER TABLE operators ADD COLUMN IF NOT EXISTS checkr_candidate_id TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS background_check_status TEXT DEFAULT 'not_started';
-- status values: not_started | invited | pending | consider | clear | suspended
ALTER TABLE operators ADD COLUMN IF NOT EXISTS checkr_invitation_url TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS background_check_completed_at TIMESTAMPTZ;
