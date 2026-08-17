-- 024_lead_renter_link.sql
-- Fixes: renters created via the public booking flow showed "0 Total Bookings"
-- forever, because nothing ever linked them to a booking.
--
-- Root cause was twofold:
--   1. /api/book/request created a renter but never stored its id anywhere.
--   2. /api/leads/[id]/convert blindly INSERTed a brand new renter, so the
--      converted booking pointed at a duplicate row while the original
--      (which held the uploaded driver's license) stayed orphaned at 0.
--
-- The Renters page derives the count live from bookings.renter_id, so the fix
-- is to make renter identity consistent across every booking-creation path.

-- 1. Let a lead remember which renter it belongs to.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS renter_id UUID REFERENCES renters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_renter ON leads(renter_id);

-- 2. Speed up the find-or-create lookups in lib/upsert-renter.ts.
CREATE INDEX IF NOT EXISTS idx_renters_operator_email
  ON renters(operator_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_renters_operator_phone
  ON renters(operator_id, phone) WHERE phone IS NOT NULL;

-- 3. Backfill: repoint bookings that landed on a duplicate renter back onto the
--    OLDEST matching renter row for that operator (matched on email or phone).
--    This collapses the duplicates so counts and license uploads line up.
WITH canonical AS (
  SELECT
    r.id AS dup_id,
    FIRST_VALUE(r.id) OVER (
      PARTITION BY r.operator_id, COALESCE(NULLIF(r.email, ''), NULLIF(r.phone, ''))
      ORDER BY r.created_at ASC
    ) AS keep_id
  FROM renters r
  WHERE COALESCE(NULLIF(r.email, ''), NULLIF(r.phone, '')) IS NOT NULL
)
UPDATE bookings b
SET renter_id = c.keep_id
FROM canonical c
WHERE b.renter_id = c.dup_id
  AND c.dup_id <> c.keep_id;

-- 4. Merge driver's license data from soon-to-be-orphaned duplicates onto the
--    canonical renter, so no uploaded license is lost.
WITH canonical AS (
  SELECT
    r.id AS dup_id,
    r.drivers_license_url,
    r.drivers_license_number,
    FIRST_VALUE(r.id) OVER (
      PARTITION BY r.operator_id, COALESCE(NULLIF(r.email, ''), NULLIF(r.phone, ''))
      ORDER BY r.created_at ASC
    ) AS keep_id
  FROM renters r
  WHERE COALESCE(NULLIF(r.email, ''), NULLIF(r.phone, '')) IS NOT NULL
)
UPDATE renters k
SET
  drivers_license_url = COALESCE(k.drivers_license_url, c.drivers_license_url),
  drivers_license_number = COALESCE(k.drivers_license_number, c.drivers_license_number)
FROM canonical c
WHERE k.id = c.keep_id
  AND c.dup_id <> c.keep_id
  AND (c.drivers_license_url IS NOT NULL OR c.drivers_license_number IS NOT NULL);

-- 5. Delete the now-unreferenced duplicate renter rows.
WITH canonical AS (
  SELECT
    r.id AS dup_id,
    FIRST_VALUE(r.id) OVER (
      PARTITION BY r.operator_id, COALESCE(NULLIF(r.email, ''), NULLIF(r.phone, ''))
      ORDER BY r.created_at ASC
    ) AS keep_id
  FROM renters r
  WHERE COALESCE(NULLIF(r.email, ''), NULLIF(r.phone, '')) IS NOT NULL
)
DELETE FROM renters
WHERE id IN (
  SELECT c.dup_id FROM canonical c WHERE c.dup_id <> c.keep_id
)
AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.renter_id = renters.id)
AND NOT EXISTS (SELECT 1 FROM contracts ct WHERE ct.renter_id = renters.id);
