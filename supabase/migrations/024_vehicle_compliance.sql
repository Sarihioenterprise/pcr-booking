-- Vehicle Compliance Vault
-- Tracks insurance, registration, inspection, and other document expiration dates per vehicle

CREATE TABLE vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'insurance', 'registration', 'state_inspection', 'city_inspection', 'tlc_inspection', 'other'
  )),
  document_name TEXT, -- custom label when document_type = 'other'
  expiry_date DATE NOT NULL,
  file_url TEXT,
  notes TEXT,
  alert_sent_30 BOOLEAN NOT NULL DEFAULT false,
  alert_sent_14 BOOLEAN NOT NULL DEFAULT false,
  alert_sent_7 BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_vehicle_documents_vehicle_id ON vehicle_documents(vehicle_id);
CREATE INDEX idx_vehicle_documents_operator_id ON vehicle_documents(operator_id);
CREATE INDEX idx_vehicle_documents_expiry_date ON vehicle_documents(expiry_date);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_vehicle_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vehicle_documents_updated_at
  BEFORE UPDATE ON vehicle_documents
  FOR EACH ROW EXECUTE FUNCTION update_vehicle_documents_updated_at();

-- RLS
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;

-- Operators can only see their own documents
CREATE POLICY "Operators can view own vehicle documents"
  ON vehicle_documents FOR SELECT
  USING (
    operator_id IN (
      SELECT id FROM operators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Operators can insert own vehicle documents"
  ON vehicle_documents FOR INSERT
  WITH CHECK (
    operator_id IN (
      SELECT id FROM operators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Operators can update own vehicle documents"
  ON vehicle_documents FOR UPDATE
  USING (
    operator_id IN (
      SELECT id FROM operators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Operators can delete own vehicle documents"
  ON vehicle_documents FOR DELETE
  USING (
    operator_id IN (
      SELECT id FROM operators WHERE user_id = auth.uid()
    )
  );
