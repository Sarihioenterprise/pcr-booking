export interface Operator {
  id: string;
  user_id: string;
  business_name: string;
  owner_name: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  logo_url: string | null;
  notification_phone: string | null;
  plan: "growth" | "pro" | "scale";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  referral_code: string | null;
  widget_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  operator_id: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  plate: string | null;
  daily_rate: number;
  status: "active" | "inactive" | "maintenance";
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  operator_id: string;
  vehicle_id: string | null;
  renter_name: string;
  renter_phone: string | null;
  renter_email: string | null;
  start_date: string;
  end_date: string;
  duration_days: number;
  daily_rate: number;
  total_price: number;
  status: "pending" | "confirmed" | "active" | "completed" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
  vehicle?: Vehicle;
}

export interface Lead {
  id: string;
  operator_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  uber_lyft_approved: boolean | null;
  valid_license: boolean | null;
  age_25_plus: boolean | null;
  dates_requested: string | null;
  duration_days: number | null;
  stage: "new" | "bot_called" | "hot_lead" | "disqualified";
  disqualify_reason: string | null;
  call_transcript: string | null;
  ghl_contact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  referrer_operator_id: string;
  referred_operator_id: string | null;
  signup_date: string;
  is_active: boolean;
  commission_pct: number;
  months_remaining: number;
  total_earned: number;
  created_at: string;
  referred_operator?: Operator;
}

export interface Subscription {
  id: string;
  operator_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  plan: "growth" | "pro" | "scale";
  status: "active" | "canceled" | "past_due" | "trialing";
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}
