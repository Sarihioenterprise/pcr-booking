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
  plan: "free" | "growth" | "pro" | "scale";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_account_id: string | null;
  referral_code: string | null;
  widget_enabled: boolean;
  brand_color: string;
  business_address: string | null;
  business_email: string | null;
  timezone: string;
  tax_rate: number;
  deposit_amount: number;
  deposit_auto_release_days: number;
  require_booking_approval: boolean;
  default_pickup_instructions: string | null;
  booking_slug: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  operator_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  is_default: boolean;
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
  vin: string | null;
  daily_rate: number;
  weekly_rate: number | null;
  monthly_rate: number | null;
  mileage: number;
  fuel_level: string;
  category: string;
  purchase_price: number | null;
  monthly_cost: number | null;
  minimum_rental_days: number;
  status: "active" | "inactive" | "maintenance";
  photo_url: string | null;
  location_id: string | null;
  created_at: string;
  updated_at: string;
  photos?: VehiclePhoto[];
  documents?: VehicleDocument[];
  location?: Location;
}

export interface VehiclePhoto {
  id: string;
  vehicle_id: string;
  url: string;
  label: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface VehicleDocument {
  id: string;
  vehicle_id: string;
  type: "title" | "registration" | "insurance" | "inspection" | "other";
  name: string;
  url: string;
  expiry_date: string | null;
  created_at: string;
}

export interface PricingRule {
  id: string;
  vehicle_id: string;
  operator_id: string;
  name: string;
  type: "peak_season" | "discount" | "surge" | "day_of_week";
  start_date: string | null;
  end_date: string | null;
  day_of_week: number | null;
  multiplier: number;
  created_at: string;
}

export interface BlackoutDate {
  id: string;
  vehicle_id: string;
  operator_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_at: string;
}

export type BookingStatus = "inquiry" | "pending" | "confirmed" | "active" | "completed" | "cancelled";

export interface Booking {
  id: string;
  operator_id: string;
  vehicle_id: string | null;
  renter_id: string | null;
  renter_name: string;
  renter_phone: string | null;
  renter_email: string | null;
  start_date: string;
  end_date: string;
  duration_days: number;
  daily_rate: number;
  total_price: number;
  tax_amount: number;
  discount_amount: number;
  deposit_amount: number;
  deposit_status: "none" | "held" | "released" | "claimed";
  deposit_payment_intent_id: string | null;
  stripe_payment_intent_id: string | null;
  status: BookingStatus;
  notes: string | null;
  pickup_instructions: string | null;
  drivers_license_url: string | null;
  location_id: string | null;
  dropoff_location_id: string | null;
  promo_code_id: string | null;
  mileage_out: number | null;
  mileage_in: number | null;
  fuel_out: string | null;
  fuel_in: string | null;
  created_at: string;
  updated_at: string;
  vehicle?: Vehicle;
  renter?: Renter;
  location?: Location;
  agreement?: RentalAgreement;
  payment_schedule?: PaymentScheduleItem[];
}

export interface Renter {
  id: string;
  operator_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  drivers_license_number: string | null;
  drivers_license_url: string | null;
  drivers_license_expiry: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  stripe_customer_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  bookings?: Booking[];
  communications?: RenterCommunication[];
}

export interface RenterCommunication {
  id: string;
  renter_id: string;
  operator_id: string;
  type: "note" | "call" | "email" | "sms" | "in_person";
  subject: string | null;
  content: string;
  created_by: string | null;
  created_at: string;
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
  source: string;
  followup_count: number;
  followup_status: "none" | "1st_contact" | "2nd_followup" | "3rd_followup" | "final_attempt" | "converted" | "lost";
  last_followup_at: string | null;
  next_followup_at: string | null;
  estimated_value: number | null;
  notes: string | null;
  city: string | null;
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
  plan: "free" | "growth" | "pro" | "scale";
  status: "active" | "canceled" | "past_due" | "trialing";
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

// Rental Agreements
export interface AgreementTemplate {
  id: string;
  operator_id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface RentalAgreement {
  id: string;
  operator_id: string;
  booking_id: string;
  template_id: string | null;
  content: string;
  status: "draft" | "sent" | "signed";
  renter_signature: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  booking?: Booking;
}

// Inspections & Damage
export type InspectionType = "pre_rental" | "post_rental";

export interface Inspection {
  id: string;
  operator_id: string;
  booking_id: string | null;
  vehicle_id: string;
  type: InspectionType;
  status: "pending" | "completed";
  mileage: number | null;
  fuel_level: string | null;
  notes: string | null;
  checklist: InspectionChecklist;
  created_at: string;
  updated_at: string;
  vehicle?: Vehicle;
  booking?: Booking;
  photos?: InspectionPhoto[];
}

export interface InspectionChecklist {
  exterior_clean: boolean;
  interior_clean: boolean;
  tires_ok: boolean;
  lights_working: boolean;
  brakes_ok: boolean;
  windshield_ok: boolean;
  mirrors_ok: boolean;
  ac_working: boolean;
  radio_working: boolean;
  spare_tire: boolean;
  jack_present: boolean;
  documentation_present: boolean;
}

export interface InspectionPhoto {
  id: string;
  inspection_id: string;
  url: string;
  label: string;
  created_at: string;
}

export interface DamageClaim {
  id: string;
  operator_id: string;
  booking_id: string;
  vehicle_id: string;
  pre_inspection_id: string | null;
  post_inspection_id: string | null;
  description: string;
  severity: "minor" | "moderate" | "major";
  estimated_cost: number | null;
  status: "open" | "in_review" | "resolved" | "dismissed";
  photos: string[];
  created_at: string;
  updated_at: string;
  vehicle?: Vehicle;
  booking?: Booking;
}

// Maintenance
export type MaintenanceStatus = "scheduled" | "in_progress" | "completed" | "overdue";

export interface MaintenanceRecord {
  id: string;
  operator_id: string;
  vehicle_id: string;
  type: string;
  description: string | null;
  status: MaintenanceStatus;
  cost: number | null;
  mileage_at_service: number | null;
  date_performed: string | null;
  date_due: string | null;
  mileage_due: number | null;
  vendor: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vehicle?: Vehicle;
}

// Notifications
export type NotificationType =
  | "new_booking"
  | "payment_received"
  | "maintenance_due"
  | "agreement_signed"
  | "ticket_opened"
  | "ticket_reply"
  | "lease_expiring"
  | "booking_status_change"
  | "damage_report";

export interface Notification {
  id: string;
  operator_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

// Support Tickets
export type TicketStatus = "open" | "in_progress" | "resolved";
export type TicketPriority = "low" | "normal" | "high" | "urgent";

export interface SupportTicket {
  id: string;
  operator_id: string;
  booking_id: string | null;
  renter_name: string;
  renter_email: string | null;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
  messages?: TicketMessage[];
  booking?: Booking;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: "renter" | "operator";
  sender_name: string;
  content: string;
  attachment_url: string | null;
  created_at: string;
}

// Payment Schedules
export interface PaymentScheduleItem {
  id: string;
  booking_id: string;
  operator_id: string;
  amount: number;
  due_date: string;
  status: "pending" | "paid" | "overdue" | "failed";
  stripe_payment_intent_id: string | null;
  paid_at: string | null;
  created_at: string;
}

// Invoices
export interface Invoice {
  id: string;
  operator_id: string;
  booking_id: string | null;
  renter_id: string | null;
  invoice_number: string;
  amount: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  booking?: Booking;
  renter?: Renter;
}

// Promo Codes
export interface PromoCode {
  id: string;
  operator_id: string;
  code: string;
  description: string | null;
  type: "percentage" | "fixed";
  value: number;
  max_uses: number | null;
  used_count: number;
  min_rental_days: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

// Team Members
export interface TeamMember {
  id: string;
  operator_id: string;
  user_id: string | null;
  name: string;
  email: string;
  role: "owner" | "manager" | "staff";
  is_active: boolean;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
}

// Email Templates
export interface EmailTemplate {
  id: string;
  operator_id: string;
  type: "booking_confirmation" | "payment_receipt" | "agreement_sent" | "reminder" | "welcome" | "custom";
  name: string;
  subject: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Webhook Endpoints
export interface WebhookEndpoint {
  id: string;
  operator_id: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret: string | null;
  last_triggered_at: string | null;
  created_at: string;
}

// Analytics
export interface AnalyticsData {
  total_revenue: number;
  revenue_change_pct: number;
  total_bookings: number;
  bookings_change_pct: number;
  active_rentals: number;
  fleet_utilization: number;
  upcoming_returns: number;
  revenue_by_month: { month: string; revenue: number }[];
  bookings_by_month: { month: string; count: number }[];
  top_vehicles: { vehicle: Vehicle; revenue: number; bookings: number }[];
  recent_activity: ActivityItem[];
  upcoming_bookings: Booking[];
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

// Earnings Estimator (PCR Exclusive)
export interface EarningsEstimate {
  city: string;
  vehicle_type: string;
  weekly_earnings_low: number;
  weekly_earnings_high: number;
  monthly_earnings_low: number;
  monthly_earnings_high: number;
  platform: "uber" | "lyft" | "both";
}
