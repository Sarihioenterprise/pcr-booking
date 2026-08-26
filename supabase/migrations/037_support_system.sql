-- Platform support tickets (operators contacting PCR Booking / Alton)
-- Separate from support_tickets which is the renter<>operator support table
CREATE TABLE IF NOT EXISTS platform_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  ticket_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'escalated')),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_support_tickets_email ON platform_support_tickets(email);
CREATE INDEX IF NOT EXISTS idx_platform_support_tickets_status ON platform_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_platform_support_tickets_type ON platform_support_tickets(ticket_type);

-- Health check log for daily cron runs
CREATE TABLE IF NOT EXISTS health_check_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz DEFAULT now(),
  fixes_applied jsonb DEFAULT '[]',
  issues_found int DEFAULT 0,
  duration_ms int
);

-- System config key/value store
CREATE TABLE IF NOT EXISTS system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Seed default values
INSERT INTO system_config (key, value) VALUES
  ('stripe_webhook_failures', '0')
ON CONFLICT (key) DO NOTHING;
