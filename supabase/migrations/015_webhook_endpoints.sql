-- Webhook endpoints for operators to connect GHL, Zapier, n8n etc.
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  secret TEXT DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_operator ON webhook_endpoints(operator_id);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'webhook_endpoints' AND policyname = 'Operators manage own webhooks') THEN
    CREATE POLICY "Operators manage own webhooks" ON webhook_endpoints
      FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
  END IF;
END $$;
