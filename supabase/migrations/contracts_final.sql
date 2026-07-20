-- FINAL clean migration — paste this fresh into an empty SQL editor

-- Contract Templates
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

-- Contract Signings
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
CREATE INDEX IF NOT EXISTS idx_contract_signings_token ON contract_signings(token);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  renter_id UUID REFERENCES renters(id) ON DELETE SET NULL,
  template_url TEXT,
  signed_pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'signed')),
  token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  renter_name TEXT,
  renter_email TEXT,
  renter_phone TEXT,
  renter_dl TEXT,
  signature_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_operator ON contracts(operator_id);
CREATE INDEX IF NOT EXISTS idx_contracts_renter ON contracts(renter_id);
CREATE INDEX IF NOT EXISTS idx_contracts_token ON contracts(token);

-- Enable RLS
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_signings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Policies (using DO block to avoid duplicates)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contract_templates' AND policyname = 'Operators manage own contract templates') THEN
    CREATE POLICY "Operators manage own contract templates" ON contract_templates FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contract_signings' AND policyname = 'Operators manage own contract signings') THEN
    CREATE POLICY "Operators manage own contract signings" ON contract_signings FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contract_templates' AND policyname = 'Public can view contract by token') THEN
    CREATE POLICY "Public can view contract by token" ON contract_templates FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contract_signings' AND policyname = 'Public can view signing by token') THEN
    CREATE POLICY "Public can view signing by token" ON contract_signings FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contract_signings' AND policyname = 'Public can update signing to sign') THEN
    CREATE POLICY "Public can update signing to sign" ON contract_signings FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contracts' AND policyname = 'Operators manage own contracts') THEN
    CREATE POLICY "Operators manage own contracts" ON contracts FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contracts' AND policyname = 'Public can view contract by token') THEN
    CREATE POLICY "Public can view contract by token" ON contracts FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contracts' AND policyname = 'Public can update contract to sign') THEN
    CREATE POLICY "Public can update contract to sign" ON contracts FOR UPDATE USING (true);
  END IF;
END $$;
