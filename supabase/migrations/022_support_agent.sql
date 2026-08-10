-- Migration 022: AI Support Agent
-- Conversational support with human-like delayed delivery, action log, feature requests.
-- Apply via Supabase Dashboard > SQL Editor. Idempotent.

CREATE TABLE IF NOT EXISTS support_conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id  UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','escalated','closed')),
  agent_tier   TEXT NOT NULL DEFAULT 'frontline' CHECK (agent_tier IN ('frontline','specialist')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_conversations_operator_idx
  ON support_conversations(operator_id, status);

CREATE TABLE IF NOT EXISTS support_conversation_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('operator','agent','system')),
  content         TEXT NOT NULL,
  agent_name      TEXT,
  deliver_after   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_messages_convo_idx
  ON support_conversation_messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS support_actions_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id     UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES support_conversations(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  params          JSONB DEFAULT '{}'::jsonb,
  result          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id     UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES support_conversations(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  detail          TEXT,
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','planned','shipped','declined')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: service role handles all access in API routes; block direct anon access.
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

-- Verification
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('support_conversations','support_conversation_messages','support_actions_log','feature_requests')
ORDER BY table_name;
