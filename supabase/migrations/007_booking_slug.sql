-- Add booking_slug to operators table for direct shareable booking links
ALTER TABLE operators ADD COLUMN IF NOT EXISTS booking_slug TEXT UNIQUE;

-- Backfill existing operators with a slug based on their referral_code
UPDATE operators SET booking_slug = LOWER(REPLACE(referral_code, 'PCR-', '')) WHERE booking_slug IS NULL AND referral_code IS NOT NULL;
