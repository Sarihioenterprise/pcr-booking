-- Contract Upload & E-Sign System

-- Contract Templates table
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content_text TEXT NOT NULL,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_operator ON contract_templates(operator_id);

-- Contract Signings table
CREATE TABLE IF NOT EXISTS contract_signings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  contract_template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
  renter_name TEXT NOT NULL,
  renter_email TEXT NOT NULL,
  renter_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'expired')),
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  signed_at TIMESTAMPTZ,
  signature_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_signings_operator ON contract_signings(operator_id);
CREATE INDEX IF NOT EXISTS idx_contract_signings_template ON contract_signings(contract_template_id);
CREATE INDEX IF NOT EXISTS idx_contract_signings_token ON contract_signings(token);
CREATE INDEX IF NOT EXISTS idx_contract_signings_status ON contract_signings(status);

-- Enable RLS
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_signings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Operators manage own contract templates" ON contract_templates
  FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));

CREATE POLICY "Operators manage own contract signings" ON contract_signings
  FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));

-- Public can view and sign contracts via token
CREATE POLICY "Public can view contract by token" ON contract_templates
  FOR SELECT USING (true);

CREATE POLICY "Public can view signing by token" ON contract_signings
  FOR SELECT USING (true);

CREATE POLICY "Public can update signing to sign" ON contract_signings
  FOR UPDATE USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_contract_templates_updated_at BEFORE UPDATE ON contract_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_contract_signings_updated_at BEFORE UPDATE ON contract_signings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
