-- PCR Booking Initial Schema

-- Operators table (business profiles)
CREATE TABLE operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  state TEXT,
  logo_url TEXT,
  notification_phone TEXT,
  plan TEXT NOT NULL DEFAULT 'growth' CHECK (plan IN ('growth', 'pro', 'scale')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  referral_code TEXT UNIQUE,
  widget_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vehicles table (fleet)
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT,
  plate TEXT,
  daily_rate NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  renter_name TEXT NOT NULL,
  renter_phone TEXT,
  renter_email TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER NOT NULL,
  daily_rate NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  uber_lyft_approved BOOLEAN,
  valid_license BOOLEAN,
  age_25_plus BOOLEAN,
  dates_requested TEXT,
  duration_days INTEGER,
  stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'bot_called', 'hot_lead', 'disqualified')),
  disqualify_reason TEXT,
  call_transcript TEXT,
  ghl_contact_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Referrals table (affiliate tracking)
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  referred_operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  signup_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  commission_pct NUMERIC(5,2) DEFAULT 30.00,
  months_remaining INTEGER DEFAULT 12,
  total_earned NUMERIC(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscriptions table (Stripe data)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  plan TEXT NOT NULL DEFAULT 'growth' CHECK (plan IN ('growth', 'pro', 'scale')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_operators_user_id ON operators(user_id);
CREATE INDEX idx_vehicles_operator_id ON vehicles(operator_id);
CREATE INDEX idx_bookings_operator_id ON bookings(operator_id);
CREATE INDEX idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_leads_operator_id ON leads(operator_id);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_operator_id);
CREATE INDEX idx_subscriptions_operator ON subscriptions(operator_id);

-- Row Level Security
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Operators can only access their own data
CREATE POLICY "Users can view own operator" ON operators
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own vehicles" ON vehicles
  FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own bookings" ON bookings
  FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own leads" ON leads
  FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own referrals" ON referrals
  FOR ALL USING (referrer_operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR ALL USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));

-- Function to auto-generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.referral_code := 'PCR-' || UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 6));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_referral_code
  BEFORE INSERT ON operators
  FOR EACH ROW
  EXECUTE FUNCTION generate_referral_code();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_operators_updated_at BEFORE UPDATE ON operators FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
