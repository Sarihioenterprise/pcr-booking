-- White label branding columns for operators table
-- These are Scale-plan-only fields used on the public /rent/[slug] booking page

ALTER TABLE operators ADD COLUMN IF NOT EXISTS brand_logo_url TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS brand_primary_color TEXT DEFAULT '#2EBD6B';
ALTER TABLE operators ADD COLUMN IF NOT EXISTS brand_company_name TEXT;
