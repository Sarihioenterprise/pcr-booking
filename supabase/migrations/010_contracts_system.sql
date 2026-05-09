-- Renter Contracts System Migration
-- Full contract management with PDF templates, signature capture, and signed PDF storage

-- Contracts table (links operators, renters, and contract data)
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  renter_id UUID REFERENCES renters(id) ON DELETE SET NULL,
  template_url TEXT, -- uploaded PDF template
  signed_pdf_url TEXT, -- completed signed contract
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'signed')),
  token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT, -- unique link token
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  renter_name TEXT,
  renter_email TEXT,
  renter_phone TEXT,
  renter_dl TEXT, -- driver's license number
  signature_data TEXT, -- base64 signature image
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_operator ON contracts(operator_id);
CREATE INDEX IF NOT EXISTS idx_contracts_renter ON contracts(renter_id);
CREATE INDEX IF NOT EXISTS idx_contracts_token ON contracts(token);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Operators can manage their own contracts
CREATE POLICY "Operators manage own contracts" ON contracts
  FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));

-- Public can view contracts by token (for signing page)
CREATE POLICY "Public can view contract by token" ON contracts
  FOR SELECT USING (true);

-- Public can update contracts (for signing)
CREATE POLICY "Public can update contract to sign" ON contracts
  FOR UPDATE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
