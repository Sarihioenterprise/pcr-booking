-- Renter Portal: magic link tokens + session tokens
-- Magic tokens: short-lived (15 min), used once to authenticate via email link
-- Session tokens: longer-lived (7 days), stored in httpOnly cookie

ALTER TABLE renters
  ADD COLUMN IF NOT EXISTS portal_magic_token TEXT,
  ADD COLUMN IF NOT EXISTS portal_magic_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portal_session_token TEXT,
  ADD COLUMN IF NOT EXISTS portal_session_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_renters_portal_magic_token
  ON renters(portal_magic_token)
  WHERE portal_magic_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_renters_portal_session_token
  ON renters(portal_session_token)
  WHERE portal_session_token IS NOT NULL;
