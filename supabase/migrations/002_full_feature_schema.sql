-- PCR Booking Full Feature Schema Migration
-- Adds all tables needed for: payments, fleet docs, renter management, multi-location,
-- inspections, maintenance, agreements, support tickets, notifications, promo codes,
-- lead pipeline, operator roles, email templates, webhooks, and more.

-- ============================================================
-- ALTER EXISTING TABLES
-- ============================================================

-- Extend operators with branding + settings
ALTER TABLE operators ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#2EBD6B';
ALTER TABLE operators ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS business_email TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE operators ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) DEFAULT 500.00;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS deposit_auto_release_days INTEGER DEFAULT 3;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS require_booking_approval BOOLEAN DEFAULT false;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS default_pickup_instructions TEXT;

-- Extend vehicles with detailed fields
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vin TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS weekly_rate NUMERIC(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS monthly_rate NUMERIC(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS mileage INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_level TEXT DEFAULT 'full';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'sedan';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS monthly_cost NUMERIC(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS minimum_rental_days INTEGER DEFAULT 1;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS location_id UUID;

-- Extend bookings with more fields
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_instructions TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS drivers_license_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS renter_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS location_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dropoff_location_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promo_code_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT 'none' CHECK (deposit_status IN ('none', 'held', 'released', 'claimed'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_payment_intent_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS mileage_out INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS mileage_in INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fuel_out TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fuel_in TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Extend leads with pipeline fields
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'widget';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_count INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS followup_status TEXT DEFAULT 'none' CHECK (followup_status IN ('none', '1st_contact', '2nd_followup', '3rd_followup', 'final_attempt', 'converted', 'lost'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_followup_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city TEXT;

-- Drop old status constraint on bookings and add new one
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('inquiry', 'pending', 'confirmed', 'active', 'completed', 'cancelled'));

-- ============================================================
-- NEW TABLES
-- ============================================================

-- Locations (multi-location support)
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_operator ON locations(operator_id);

-- Vehicle Photos (multiple per vehicle)
CREATE TABLE IF NOT EXISTS vehicle_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_photos_vehicle ON vehicle_photos(vehicle_id);

-- Vehicle Documents (title, registration, insurance)
CREATE TABLE IF NOT EXISTS vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('title', 'registration', 'insurance', 'inspection', 'other')),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle ON vehicle_documents(vehicle_id);

-- Renters (full renter profiles)
CREATE TABLE IF NOT EXISTS renters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  drivers_license_number TEXT,
  drivers_license_url TEXT,
  drivers_license_expiry DATE,
  date_of_birth DATE,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  is_blacklisted BOOLEAN DEFAULT false,
  blacklist_reason TEXT,
  stripe_customer_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_renters_operator ON renters(operator_id);
CREATE INDEX IF NOT EXISTS idx_renters_email ON renters(email);

-- Renter Communication Log
CREATE TABLE IF NOT EXISTS renter_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renter_id UUID NOT NULL REFERENCES renters(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note', 'call', 'email', 'sms', 'in_person')),
  subject TEXT,
  content TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_renter_comms_renter ON renter_communications(renter_id);

-- Payment Schedule Items (for long-term rentals)
CREATE TABLE IF NOT EXISTS payment_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'failed')),
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_schedule_booking ON payment_schedule(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedule_operator ON payment_schedule(operator_id);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  renter_id UUID REFERENCES renters(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_operator ON invoices(operator_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking ON invoices(booking_id);

-- Promo Codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value NUMERIC(10,2) NOT NULL,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  min_rental_days INTEGER DEFAULT 1,
  valid_from DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_operator ON promo_codes(operator_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_codes_unique ON promo_codes(operator_id, code);

-- Rental Agreement Templates
CREATE TABLE IF NOT EXISTS agreement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agreement_templates_operator ON agreement_templates(operator_id);

-- Rental Agreements (per booking)
CREATE TABLE IF NOT EXISTS rental_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  template_id UUID REFERENCES agreement_templates(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed')),
  renter_signature TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_agreements_booking ON rental_agreements(booking_id);
CREATE INDEX IF NOT EXISTS idx_rental_agreements_operator ON rental_agreements(operator_id);

-- Inspections
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pre_rental', 'post_rental')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  mileage INTEGER,
  fuel_level TEXT,
  notes TEXT,
  checklist JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspections_vehicle ON inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_booking ON inspections(booking_id);
CREATE INDEX IF NOT EXISTS idx_inspections_operator ON inspections(operator_id);

-- Inspection Photos
CREATE TABLE IF NOT EXISTS inspection_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_photos_inspection ON inspection_photos(inspection_id);

-- Damage Claims
CREATE TABLE IF NOT EXISTS damage_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  pre_inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
  post_inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'major')),
  estimated_cost NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed')),
  photos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_damage_claims_operator ON damage_claims(operator_id);
CREATE INDEX IF NOT EXISTS idx_damage_claims_vehicle ON damage_claims(vehicle_id);

-- Maintenance Records
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue')),
  cost NUMERIC(10,2),
  mileage_at_service INTEGER,
  date_performed DATE,
  date_due DATE,
  mileage_due INTEGER,
  vendor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_operator ON maintenance_records(operator_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status);

-- Notifications (in-app)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_operator ON notifications(operator_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(operator_id, is_read) WHERE is_read = false;

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  renter_name TEXT NOT NULL,
  renter_email TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_operator ON support_tickets(operator_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);

-- Ticket Messages
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('renter', 'operator')),
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);

-- Operator Team Members (roles)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
  is_active BOOLEAN DEFAULT true,
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_members_operator ON team_members(operator_id);

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('booking_confirmation', 'payment_receipt', 'agreement_sent', 'reminder', 'welcome', 'custom')),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_operator ON email_templates(operator_id);

-- Webhook Endpoints (Zapier integration)
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  secret TEXT,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_operator ON webhook_endpoints(operator_id);

-- Pricing Rules (dynamic pricing)
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('peak_season', 'discount', 'surge', 'day_of_week')),
  start_date DATE,
  end_date DATE,
  day_of_week INTEGER,
  multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_vehicle ON pricing_rules(vehicle_id);

-- Blackout Dates (per vehicle)
CREATE TABLE IF NOT EXISTS blackout_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blackout_dates_vehicle ON blackout_dates(vehicle_id);

-- ============================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE renters ENABLE ROW LEVEL SECURITY;
ALTER TABLE renter_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agreement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE damage_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE blackout_dates ENABLE ROW LEVEL SECURITY;

-- RLS policies using operator_id pattern
CREATE POLICY "Operators manage own locations" ON locations FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
CREATE POLICY "Operators manage vehicle photos" ON vehicle_photos FOR ALL USING (vehicle_id IN (SELECT v.id FROM vehicles v JOIN operators o ON v.operator_id = o.id WHERE o.user_id = auth.uid()));
CREATE POLICY "Operators manage vehicle documents" ON vehicle_documents FOR ALL USING (vehicle_id IN (SELECT v.id FROM vehicles v JOIN operators o ON v.operator_id = o.id WHERE o.user_id = auth.uid()));
CREATE POLICY "Operators manage own renters" ON renters FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
CREATE POLICY "Operators manage renter comms" ON renter_communications FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
CREATE POLICY "Operators manage payment schedule" ON payment_schedule FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
CREATE POLICY "Operators manage invoices" ON invoices FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
CREATE POLICY "Operators manage promo codes" ON promo_codes FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
CREATE POLICY "Operators manage agreement templates" ON agreement_templates FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
CREATE POLICY "Operators manage rental agreements" ON rental_agreements FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
CREATE POLICY "Operators manage inspections" ON inspections FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
CREATE POLICY "Operators manage inspection photos" ON inspection_photos FOR ALL USING (inspection_id IN (SELECT i.id FROM inspections i JOIN operators o ON i.operator_id = o.id WHERE o.user_id = auth.uid()));
CREATE POLICY "Operators manage damage claims" ON damage_claims FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
CREATE POLICY "Operators manage maintenance" ON maintenance_records FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
CREATE POLICY "Operators manage notifications" ON notifications FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
CREATE POLICY "Operators manage support tickets" ON support_tickets FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
CREATE POLICY "Operators manage ticket messages" ON ticket_messages FOR ALL USING (ticket_id IN (SELECT t.id FROM support_tickets t JOIN operators o ON t.operator_id = o.id WHERE o.user_id = auth.uid()));
CREATE POLICY "Operators manage team members" ON team_members FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
CREATE POLICY "Operators manage email templates" ON email_templates FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
CREATE POLICY "Operators manage webhooks" ON webhook_endpoints FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
CREATE POLICY "Operators manage pricing rules" ON pricing_rules FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));
CREATE POLICY "Operators manage blackout dates" ON blackout_dates FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));

-- Public access policies for renter portal (no auth required)
CREATE POLICY "Public can view bookings by id" ON bookings FOR SELECT USING (true);
CREATE POLICY "Public can view rental agreements" ON rental_agreements FOR SELECT USING (true);
CREATE POLICY "Public can update rental agreements signature" ON rental_agreements FOR UPDATE USING (true);
CREATE POLICY "Public can insert support tickets" ON support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view support tickets" ON support_tickets FOR SELECT USING (true);
CREATE POLICY "Public can insert ticket messages" ON ticket_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view ticket messages" ON ticket_messages FOR SELECT USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_renters_updated_at BEFORE UPDATE ON renters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_agreement_templates_updated_at BEFORE UPDATE ON agreement_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_rental_agreements_updated_at BEFORE UPDATE ON rental_agreements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_damage_claims_updated_at BEFORE UPDATE ON damage_claims FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_maintenance_records_updated_at BEFORE UPDATE ON maintenance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
