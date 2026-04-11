-- Renter Documents Migration
-- Adds table for tracking renter documents (insurance, license, etc.)

-- ============================================================
-- CREATE renter_documents table
-- ============================================================

CREATE TABLE IF NOT EXISTS renter_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'other' CHECK (document_type IN ('insurance', 'license', 'other')),
  file_url TEXT,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_renter_documents_operator ON renter_documents(operator_id);
CREATE INDEX IF NOT EXISTS idx_renter_documents_booking ON renter_documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_renter_documents_expiry ON renter_documents(expiry_date);

-- ============================================================
-- RLS for renter_documents
-- ============================================================

ALTER TABLE renter_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators can view their renter documents"
  ON renter_documents FOR SELECT
  USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));

CREATE POLICY "Operators can insert their renter documents"
  ON renter_documents FOR INSERT
  WITH CHECK (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));

CREATE POLICY "Operators can update their renter documents"
  ON renter_documents FOR UPDATE
  USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()))
  WITH CHECK (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));

CREATE POLICY "Operators can delete their renter documents"
  ON renter_documents FOR DELETE
  USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
