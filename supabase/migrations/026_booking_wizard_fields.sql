-- 026_booking_wizard_fields.sql
-- Adds fields needed by the 9-step booking wizard to the bookings table.
-- Migration date: 2026-08-20

-- 1. Link a booking to its signed rental agreement
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS agreement_id UUID REFERENCES rental_agreements(id) ON DELETE SET NULL;

-- 2. Link a booking to its pickup inspection record
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pickup_inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL;

-- 3. Pickup location text (free-form from wizard step 1)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pickup_location TEXT;

-- 4. Pickup and return times (stored as HH:MM strings)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pickup_time TEXT,
  ADD COLUMN IF NOT EXISTS return_time TEXT;

-- 5. Renter DOB for KYC / age verification
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS renter_dob TEXT;

-- 6. Driver's license extra fields (number is already in renters table,
--    but capture state + expiry directly on booking for quick reference)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS renter_license_state TEXT,
  ADD COLUMN IF NOT EXISTS renter_license_expiry TEXT,
  ADD COLUMN IF NOT EXISTS renter_license_photo_path TEXT;

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_bookings_agreement_id ON bookings(agreement_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_inspection_id ON bookings(pickup_inspection_id);

-- Verification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name IN (
    'agreement_id', 'pickup_inspection_id', 'pickup_location',
    'pickup_time', 'return_time', 'renter_dob',
    'renter_license_state', 'renter_license_expiry', 'renter_license_photo_path'
  )
ORDER BY column_name;
