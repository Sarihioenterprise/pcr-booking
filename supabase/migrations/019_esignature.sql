-- PCR Booking: E-Signature for Rental Agreements
-- Migration 019 — 2026-08-08
-- Apply in: Supabase Dashboard > SQL Editor
-- DO NOT run DDL locally; paste into Supabase SQL editor.

-- ─── 1. Extend rental_agreements with e-signature capture fields ───────────

ALTER TABLE rental_agreements
  ADD COLUMN IF NOT EXISTS sign_token   TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS sent_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS viewed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signer_ip    TEXT,
  ADD COLUMN IF NOT EXISTS signer_ua    TEXT,
  ADD COLUMN IF NOT EXISTS signature_png_b64 TEXT;  -- Base64 PNG of drawn signature

-- Backfill sign_token for any existing rows that have none
UPDATE rental_agreements
  SET sign_token = gen_random_uuid()::text
WHERE sign_token IS NULL;

-- Fast token lookup index
CREATE INDEX IF NOT EXISTS idx_rental_agreements_sign_token
  ON rental_agreements(sign_token);

-- ─── 2. Storage bucket for signature PNGs (private) ───────────────────────
-- Private bucket; operator access only; public link never exposed.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signatures',
  'signatures',
  false,
  524288,                  -- 512 KB max per signature
  ARRAY['image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Operators can read their own signature files (subfolder = operator_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Operators read own signatures'
  ) THEN
    CREATE POLICY "Operators read own signatures" ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'signatures'
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM operators WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Service role can insert signature files (server-side upload)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Service role insert signatures'
  ) THEN
    CREATE POLICY "Service role insert signatures" ON storage.objects
      FOR INSERT
      WITH CHECK (bucket_id = 'signatures');
  END IF;
END $$;

-- ─── 3. Ensure public RLS policies exist on rental_agreements ─────────────
-- These should already exist from migration 002, but IF NOT EXISTS guard:

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'rental_agreements'
      AND policyname = 'Public can view rental agreements'
  ) THEN
    CREATE POLICY "Public can view rental agreements"
      ON rental_agreements FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'rental_agreements'
      AND policyname = 'Public can update rental agreements signature'
  ) THEN
    CREATE POLICY "Public can update rental agreements signature"
      ON rental_agreements FOR UPDATE USING (true);
  END IF;
END $$;

-- ─── 4. Seed default rental agreement template for all operators ───────────

INSERT INTO agreement_templates (operator_id, name, content, is_default)
SELECT
  o.id,
  'Standard Rental Agreement',
  E'VEHICLE RENTAL AGREEMENT\n'
  || E'────────────────────────────────────────────────────────────────\n'
  || E'⚠️  TEMPLATE — Review with your attorney before use.\n'
  || E'────────────────────────────────────────────────────────────────\n\n'
  || E'This Vehicle Rental Agreement ("Agreement") is entered into as of {{start_date}}\n'
  || E'between:\n\n'
  || E'RENTAL COMPANY:  {{business_name}}\n'
  || E'RENTER:          {{renter_name}}\n\n'
  || E'VEHICLE:         {{vehicle}}\n'
  || E'RENTAL PERIOD:   {{start_date}} through {{end_date}}\n'
  || E'DAILY RATE:      {{daily_rate}}\n'
  || E'TOTAL AMOUNT:    {{total}}\n'
  || E'{{addons}}\n\n'
  || E'════════════════════════════════════════════════════════════════\n\n'
  || E'1. VEHICLE CONDITION\n'
  || E'Renter acknowledges receipt of the vehicle in good working condition and agrees\n'
  || E'to return it in the same condition, subject to normal wear and tear.\n\n'
  || E'2. DAMAGE RESPONSIBILITY\n'
  || E'Renter is fully responsible for ALL damage to the vehicle during the rental period,\n'
  || E'regardless of fault, including but not limited to: collision, vandalism, weather\n'
  || E'damage, interior damage, tire damage, underbody damage, and towing costs.\n\n'
  || E'3. INSURANCE\n'
  || E'Renter represents that they maintain valid automobile liability insurance covering\n'
  || E'the operation of a non-owned vehicle. If no such coverage exists, renter accepts\n'
  || E'full financial liability for any damage, loss, or third-party claims.\n'
  || E'THE RENTAL COMPANY DOES NOT PROVIDE INSURANCE.\n\n'
  || E'4. FUEL POLICY\n'
  || E'Vehicle is provided with a full fuel tank. Renter agrees to return it full. Failure\n'
  || E'to do so results in a refueling charge at market rate plus a $25 service fee.\n\n'
  || E'5. MILEAGE\n'
  || E'Unlimited mileage is included unless a specific mileage cap is noted in the booking\n'
  || E'confirmation. Excess mileage is billed at the agreed per-mile rate.\n\n'
  || E'6. LATE RETURN\n'
  || E'Returns past the agreed end date/time are billed at the full daily rate per 24-hour\n'
  || E'period (or fraction thereof), without proration.\n\n'
  || E'7. PROHIBITED USE\n'
  || E'The vehicle may NOT be used for:\n'
  || E'  (a) Any illegal purpose\n'
  || E'  (b) Commercial livery, rideshare, or delivery services without prior written consent\n'
  || E'  (c) Off-road driving\n'
  || E'  (d) Towing without prior written approval\n'
  || E'  (e) Operation by anyone not named in this agreement\n'
  || E'  (f) Racing or speed testing\n\n'
  || E'8. TRAFFIC VIOLATIONS & TOLLS\n'
  || E'Renter is solely responsible for all parking tickets, toll charges, moving violations,\n'
  || E'and any associated administrative fees incurred during the rental period. Renter\n'
  || E'authorizes the rental company to charge their payment method for any violations\n'
  || E'discovered after vehicle return.\n\n'
  || E'9. SMOKING, VAPING & PETS\n'
  || E'Smoking and vaping inside the vehicle are strictly prohibited. Pets must be in a\n'
  || E'carrier. Violations incur a minimum cleaning/deodorizing fee of $250, or actual\n'
  || E'cost if greater.\n\n'
  || E'10. ACCIDENTS & BREAKDOWN\n'
  || E'In the event of an accident: (a) ensure safety and call 911 if anyone is injured,\n'
  || E'(b) do not admit fault, (c) photograph all vehicles and damage, (d) collect all\n'
  || E'party information, (e) notify the rental company immediately.\n'
  || E'Do not authorize repairs without rental company approval.\n\n'
  || E'11. RETURN INSPECTION\n'
  || E'Vehicle is subject to inspection upon return. Renter agrees to be present if\n'
  || E'requested. Pre-existing damage has been noted; all other damage found on return\n'
  || E'is the renter''s financial responsibility.\n\n'
  || E'12. DEPOSIT\n'
  || E'Any security deposit collected will be returned within 5 business days after vehicle\n'
  || E'return, less deductions for damage, missing fuel, mileage overages, cleaning fees,\n'
  || E'or any outstanding balances.\n\n'
  || E'13. LIMITATION OF LIABILITY\n'
  || E'Rental company is not liable for any personal property left in the vehicle, lost\n'
  || E'time, or consequential damages arising from vehicle malfunction.\n\n'
  || E'14. GOVERNING LAW\n'
  || E'This Agreement is governed by the laws of the state in which the vehicle is\n'
  || E'registered and the rental originates.\n\n'
  || E'15. ENTIRE AGREEMENT\n'
  || E'This Agreement constitutes the complete understanding between the parties and\n'
  || E'supersedes all prior oral or written representations.\n\n'
  || E'════════════════════════════════════════════════════════════════\n\n'
  || E'By signing electronically below, Renter acknowledges they have READ, UNDERSTOOD,\n'
  || E'and AGREED to all terms and conditions of this Agreement.\n\n'
  || E'RENTER: {{renter_name}}        DATE: {{start_date}}',
  true
FROM operators o
WHERE NOT EXISTS (
  SELECT 1 FROM agreement_templates t
  WHERE t.operator_id = o.id
    AND t.is_default = true
);

-- ─── Verification ─────────────────────────────────────────────────────────

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'rental_agreements'
  AND column_name IN (
    'sign_token', 'sent_at', 'viewed_at',
    'signer_ip', 'signer_ua', 'signature_png_b64'
  )
ORDER BY column_name;
