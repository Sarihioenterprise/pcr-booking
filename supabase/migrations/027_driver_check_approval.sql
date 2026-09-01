-- Add approval tracking to driver_checks table
ALTER TABLE driver_checks
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'disapproved', 'flagged')),
  ADD COLUMN IF NOT EXISTS approval_reason TEXT,
  ADD COLUMN IF NOT EXISTS auto_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manually_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manually_approved_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_driver_checks_approval_status ON driver_checks(approval_status);
CREATE INDEX IF NOT EXISTS idx_driver_checks_operator_approval ON driver_checks(operator_id, approval_status);
