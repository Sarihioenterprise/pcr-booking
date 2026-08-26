-- PCR Booking trial nurture sequence tracking
-- Tracks which nurture emails have been sent to each trial user
-- and when their nurture sequence should stop (conversion or cancellation).

CREATE TABLE IF NOT EXISTS pcr_booking_nurture (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  email text NOT NULL,
  first_name text,
  ghl_contact_id text,
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  emails_sent int[] DEFAULT '{}',  -- array of day numbers sent, e.g. {1,3,10}
  stopped_at timestamptz,          -- set when they convert to paid or cancel
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pcr_booking_nurture_email ON pcr_booking_nurture(email);
CREATE INDEX IF NOT EXISTS idx_pcr_booking_nurture_stopped ON pcr_booking_nurture(stopped_at) WHERE stopped_at IS NULL;
