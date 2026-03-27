-- PCR Booking — Full Database Schema

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- OPERATORS (business profiles)
-- ============================================================
create table public.operators (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  owner_name text not null,
  phone text,
  city text,
  state text,
  logo_url text,
  plan text not null default 'growth' check (plan in ('growth', 'pro', 'scale')),
  stripe_customer_id text,
  stripe_subscription_id text,
  referral_code text unique default encode(gen_random_bytes(6), 'hex'),
  notification_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index operators_user_id_idx on public.operators(user_id);

-- ============================================================
-- VEHICLES (fleet)
-- ============================================================
create table public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  operator_id uuid not null references public.operators(id) on delete cascade,
  make text not null,
  model text not null,
  year integer not null,
  color text,
  plate text,
  daily_rate numeric(10,2) not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive', 'maintenance')),
  photo_url text,
  created_at timestamptz not null default now()
);

create index vehicles_operator_id_idx on public.vehicles(operator_id);

-- ============================================================
-- BOOKINGS
-- ============================================================
create table public.bookings (
  id uuid primary key default uuid_generate_v4(),
  operator_id uuid not null references public.operators(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  renter_name text not null,
  renter_phone text,
  renter_email text,
  start_date date not null,
  end_date date not null,
  duration_days integer not null,
  daily_rate numeric(10,2) not null default 0,
  total_price numeric(10,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

create index bookings_operator_id_idx on public.bookings(operator_id);
create index bookings_vehicle_id_idx on public.bookings(vehicle_id);
create index bookings_status_idx on public.bookings(status);

-- ============================================================
-- LEADS (inbound + bot qualification)
-- ============================================================
create table public.leads (
  id uuid primary key default uuid_generate_v4(),
  operator_id uuid not null references public.operators(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  uber_lyft_approved boolean,
  valid_license boolean,
  age_25_plus boolean,
  dates_requested text,
  duration_days integer,
  stage text not null default 'new' check (stage in ('new', 'bot_called', 'hot_lead', 'disqualified')),
  disqualify_reason text,
  call_transcript text,
  ghl_contact_id text,
  created_at timestamptz not null default now()
);

create index leads_operator_id_idx on public.leads(operator_id);
create index leads_stage_idx on public.leads(stage);

-- ============================================================
-- REFERRALS (affiliate tracking)
-- ============================================================
create table public.referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_operator_id uuid not null references public.operators(id) on delete cascade,
  referred_operator_id uuid not null references public.operators(id) on delete cascade,
  signup_date timestamptz not null default now(),
  is_active boolean not null default true,
  commission_pct numeric(5,2) not null default 30.00,
  months_remaining integer not null default 12,
  total_earned numeric(10,2) not null default 0
);

create index referrals_referrer_idx on public.referrals(referrer_operator_id);

-- ============================================================
-- SUBSCRIPTIONS (Stripe data)
-- ============================================================
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  operator_id uuid not null references public.operators(id) on delete cascade,
  stripe_subscription_id text not null,
  stripe_price_id text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index subscriptions_operator_id_idx on public.subscriptions(operator_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.operators enable row level security;
alter table public.vehicles enable row level security;
alter table public.bookings enable row level security;
alter table public.leads enable row level security;
alter table public.referrals enable row level security;
alter table public.subscriptions enable row level security;

-- Operators: users can only access their own record
create policy "Users can view own operator" on public.operators
  for select using (auth.uid() = user_id);
create policy "Users can update own operator" on public.operators
  for update using (auth.uid() = user_id);
create policy "Users can insert own operator" on public.operators
  for insert with check (auth.uid() = user_id);

-- Vehicles: operators can only manage their own fleet
create policy "Operators manage own vehicles" on public.vehicles
  for all using (
    operator_id in (select id from public.operators where user_id = auth.uid())
  );

-- Bookings: operators can only manage their own bookings
create policy "Operators manage own bookings" on public.bookings
  for all using (
    operator_id in (select id from public.operators where user_id = auth.uid())
  );

-- Leads: operators can only view their own leads
create policy "Operators manage own leads" on public.leads
  for all using (
    operator_id in (select id from public.operators where user_id = auth.uid())
  );

-- Referrals: operators can view referrals they made
create policy "Operators view own referrals" on public.referrals
  for select using (
    referrer_operator_id in (select id from public.operators where user_id = auth.uid())
  );

-- Subscriptions: operators can view own subscription
create policy "Operators view own subscription" on public.subscriptions
  for select using (
    operator_id in (select id from public.operators where user_id = auth.uid())
  );
