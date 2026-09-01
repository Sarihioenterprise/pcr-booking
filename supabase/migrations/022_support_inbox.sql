-- Support emails table: every inbound email captured
CREATE TABLE IF NOT EXISTS support_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  operator_id UUID REFERENCES operators(id),
  ghl_contact_id TEXT,
  classification TEXT CHECK (classification IN ('support', 'feature_request', 'general', 'spam', 'unclassified')) DEFAULT 'unclassified',
  raw_payload JSONB,
  processed_at TIMESTAMPTZ
);

-- Feature requests table: extracted from support emails, deduplicated
CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  summary TEXT NOT NULL,
  description TEXT,
  request_count INTEGER DEFAULT 1,
  status TEXT CHECK (status IN ('pending', 'planned', 'in_progress', 'shipped', 'declined')) DEFAULT 'pending',
  shipped_at TIMESTAMPTZ,
  announcement_sent BOOLEAN DEFAULT FALSE,
  tags TEXT[]
);

-- Link table: which support emails map to which feature request
CREATE TABLE IF NOT EXISTS feature_request_emails (
  feature_request_id UUID REFERENCES feature_requests(id) ON DELETE CASCADE,
  support_email_id UUID REFERENCES support_emails(id) ON DELETE CASCADE,
  PRIMARY KEY (feature_request_id, support_email_id)
);

CREATE INDEX IF NOT EXISTS idx_support_emails_operator ON support_emails(operator_id);
CREATE INDEX IF NOT EXISTS idx_support_emails_classification ON support_emails(classification);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
