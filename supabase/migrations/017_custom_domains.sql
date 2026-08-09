-- PCR Booking Tier 2: Custom Domains + Auto-Slug
-- Migration 017
-- Date: 2026-08-09
-- Apply via: Supabase Dashboard > SQL Editor

-- 1. Add custom_domain column to operators
--    Unique so two operators can't claim the same domain
ALTER TABLE operators ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

-- 2. Add custom_domain_status column
--    Values: 'pending' | 'active' | 'error' | null
ALTER TABLE operators ADD COLUMN IF NOT EXISTS custom_domain_status TEXT DEFAULT NULL;

-- 3. Index for fast middleware lookup by custom_domain
CREATE INDEX IF NOT EXISTS operators_custom_domain_idx
  ON operators(custom_domain)
  WHERE custom_domain IS NOT NULL;

-- 4. Index for fast lookup by booking_slug (already may exist, safe if not)
CREATE INDEX IF NOT EXISTS operators_booking_slug_idx
  ON operators(booking_slug)
  WHERE booking_slug IS NOT NULL;

-- Verify
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'operators'
  AND column_name IN ('custom_domain', 'custom_domain_status', 'booking_slug')
ORDER BY column_name;
