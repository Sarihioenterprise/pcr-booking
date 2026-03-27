# PCR Booking — Full App Spec

## What It Is
PCR Booking is a SaaS booking platform for private rental car operators — specifically targeting Uber/Lyft/gig worker vehicle rentals. Operators sign up, get a booking widget for their website, manage their fleet, and see all leads and bookings from a mobile-friendly dashboard.

---

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (Postgres + Auth + Realtime)
- **Payments:** Stripe (subscriptions + one-time)
- **Deployment:** Vercel
- **Language:** TypeScript throughout

---

## Core Features to Build (MVP)

### 1. Auth + Onboarding
- Supabase Auth (email/password + Google OAuth)
- Onboarding flow after signup:
  - Business name
  - Owner name
  - Phone number
  - City/State
  - Upload logo (optional)
- Creates `operators` table record on completion

### 2. Dashboard (Main App)
Mobile-first layout. Bottom nav on mobile, sidebar on desktop.

**Bottom Nav Tabs:**
- 🏠 Dashboard (overview)
- 📅 Bookings
- 🚗 Fleet
- 👥 Leads
- ⚙️ Settings

**Dashboard Overview Cards:**
- Total bookings this month
- Revenue this month (placeholder, $0 until payment integration)
- Active rentals right now
- Leads today
- Upcoming returns (next 48hrs)

### 3. Fleet Management
- Add vehicles (make, model, year, color, license plate, daily rate, photo)
- Toggle availability (active/inactive/maintenance)
- Vehicle detail page showing booking history

**`vehicles` table:**
```
id, operator_id, make, model, year, color, plate, daily_rate, status (active/inactive/maintenance), photo_url, created_at
```

### 4. Bookings
- List view of all bookings with status (pending/confirmed/active/completed/cancelled)
- Booking detail: renter name, phone, dates, vehicle, duration, total price
- Manually create a booking
- Update booking status

**`bookings` table:**
```
id, operator_id, vehicle_id, renter_name, renter_phone, renter_email, start_date, end_date, duration_days, daily_rate, total_price, status, notes, created_at
```

### 5. Leads (Bot Qualification Results)
This is where the Vapi calling bot posts results back via webhook.

- List of all leads with qualification status
- Lead stages: New → Bot Called → Hot Lead / Disqualified
- Filter by stage
- Lead detail: name, phone, dates requested, duration, qualification answers, call transcript snippet

**`leads` table:**
```
id, operator_id, name, phone, email, uber_lyft_approved (bool), valid_license (bool), age_25_plus (bool), dates_requested, duration_days, stage (new/bot_called/hot_lead/disqualified), disqualify_reason, call_transcript, ghl_contact_id, created_at
```

### 6. Booking Widget (Embeddable)
A script tag operators paste on their website:
```html
<script src="https://pcrbooking.com/widget.js" data-operator="[operator-id]"></script>
```
Widget shows:
- Available vehicles for selected dates
- Simple form: name, phone, email, dates, duration
- On submit → creates lead in Supabase + fires webhook to n8n (which triggers the bot call)

Widget should be a standalone React component compiled to a single JS file.

### 7. Webhook Endpoint (for Bot Results)
`POST /api/webhooks/lead-qualified`

Receives from n8n/Vapi after a call completes:
```json
{
  "lead_id": "uuid",
  "operator_id": "uuid",
  "uber_lyft_approved": true,
  "valid_license": true,
  "age_25_plus": true,
  "stage": "hot_lead",
  "disqualify_reason": null,
  "transcript": "..."
}
```
Updates lead record + if hot_lead → sends operator SMS notification (via GHL webhook or Twilio).

### 8. Settings
- Business info (edit name, logo, address, phone)
- Notification preferences (SMS number for hot lead alerts)
- Affiliate link (show operator their unique referral code + earnings)
- Subscription plan (current plan, upgrade button)
- API/Widget: show their embed code

### 9. Subscription Plans (Stripe)
Three plans:
- **Growth:** $79/mo — up to 15 vehicles
- **Pro:** $149/mo — up to 40 vehicles, multi-location
- **Scale:** $249/mo — unlimited vehicles, white-label, priority support

Stripe Checkout for upgrades. Stripe webhook to update `operators.plan` in Supabase.

### 10. Affiliate System
- Each operator gets a unique `referral_code` on signup
- Track referral signups in `referrals` table
- Affiliates earn 30% recurring for 12 months
- Simple affiliate dashboard showing: clicks, signups, active referrals, total earned
- (Actual payout handled via Rewardful integration — just show the data)

**`referrals` table:**
```
id, referrer_operator_id, referred_operator_id, signup_date, is_active, commission_pct, months_remaining, total_earned
```

---

## Database Schema Summary

### Tables
- `operators` — business profiles
- `vehicles` — fleet
- `bookings` — confirmed/active/completed rentals
- `leads` — all inbound leads + bot qualification results
- `referrals` — affiliate tracking
- `subscriptions` — Stripe subscription data

### Supabase RLS
- Operators can only read/write their own records
- Webhook endpoint uses service role key (bypasses RLS)

---

## Pages / Routes

```
/                          → Marketing landing page
/pricing                   → Pricing page
/affiliates                → Affiliate program info page
/auth/login                → Login
/auth/signup               → Signup
/auth/onboarding           → Onboarding flow (after first login)

/dashboard                 → Overview
/dashboard/bookings        → Bookings list
/dashboard/bookings/[id]   → Booking detail
/dashboard/bookings/new    → Create booking manually
/dashboard/fleet           → Vehicle list
/dashboard/fleet/new       → Add vehicle
/dashboard/fleet/[id]      → Vehicle detail
/dashboard/leads           → Leads list + filter
/dashboard/leads/[id]      → Lead detail
/dashboard/settings        → Settings
/dashboard/settings/widget → Embed code
/dashboard/affiliates      → Affiliate dashboard

/api/webhooks/lead-result  → Bot posts call results here
/api/webhooks/stripe       → Stripe subscription events
/api/leads                 → Widget form submission endpoint
```

---

## Landing Page Sections
1. Hero: "The Booking Platform Built for Private Rental Operators" — CTA: Start Free Trial
2. Problem: "Giving Turo 30% of every booking? Keep 100% with your own system."
3. Features: Booking widget, fleet management, AI qualification bot, mobile app
4. How It Works: 3 steps (sign up → embed widget → get bookings)
5. Pricing: 3 tiers
6. Affiliate section: "Refer operators, earn 30% for 12 months"
7. CTA: Get Started Free

---

## Design Direction

### Brand Family: PCR Ecosystem
PCR Booking and PCR Leads are sister companies. The design should feel like they belong together — same DNA, slightly different personality.

### PCR Leads Branding (source of truth from join.pcrleads.com)
- Background: `#080812` (near black, slight blue tint)
- Surface/card background: `#0c0c1c`
- Darkest bg: `#050509`
- Primary accent: `#2EBD6B` (green — their main CTA color)
- Error/alert: `#ef4444`
- Font: **Inter** (Google Fonts, weights 400–900)
- Aesthetic: Dark, modern, fintech/tech — clean and premium

### PCR Booking Design (match + differentiate)
- **Same base:** Keep the deep dark background family (`#080812`, `#0c0c1c`)
- **Add white/light:** Introduce white and light gray surfaces to make it feel like an *app dashboard* vs a marketing page. PCR Leads is a landing page — PCR Booking is a product people live in daily.
  - Card backgrounds: `#111120` with subtle `#ffffff08` borders
  - Sidebar/nav: `#0c0c1c`
  - Content areas: `#080812`
  - Use `white/5`, `white/10`, `white/20` for layering (Tailwind opacity utilities)
- **Primary accent:** Keep `#2EBD6B` green — same as PCR Leads, signals same ecosystem
- **Secondary accent:** Add a soft white/silver highlight for labels, secondary text, borders
- **Success states (Hot Lead):** `#2EBD6B` green glow/badge
- **Disqualified:** `#ef4444` red badge
- **Pending/neutral:** `#94a3b8` (slate-400)
- **Font:** Inter — exact same as PCR Leads

### Tailwind Config Additions
```js
colors: {
  brand: {
    green: '#2EBD6B',
    greenDark: '#1a9952',
    bg: '#080812',
    surface: '#0c0c1c',
    card: '#111120',
    border: 'rgba(255,255,255,0.08)',
  }
}
```

### Feel
- PCR Leads: dark marketing page, aggressive, "get leads now"
- PCR Booking: dark product dashboard, clean, professional, "you're in control"
- Same family, different mood — like how Stripe's homepage vs Stripe Dashboard both feel like Stripe

### Components Style
- Cards: dark bg with thin white/8 border, subtle shadow
- Buttons (primary): `#2EBD6B` fill with white text, slight glow on hover
- Buttons (secondary): transparent with white/10 border
- Badges: pill shape, color-coded (green/red/slate)
- Tables: striped with white/5 rows
- Nav (mobile bottom): `#0c0c1c` with green active indicator
- shadcn/ui components throughout — override default theme with above colors

---

## Environment Variables Needed
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=https://pcrbooking.com
```

---

## Build Instructions for Claude Code

1. Init Next.js 14 app with TypeScript + Tailwind + App Router
2. Install and configure shadcn/ui
3. Set up Supabase client (browser + server)
4. Build the full database schema (migration file)
5. Build auth (login, signup, onboarding)
6. Build dashboard shell with mobile bottom nav + desktop sidebar
7. Build Fleet management (CRUD)
8. Build Leads page with stage filtering
9. Build Bookings page
10. Build Settings page with embed code display
11. Build Landing page
12. Build Pricing page
13. Build Affiliate dashboard
14. Build webhook endpoints (/api/leads, /api/webhooks/lead-result)
15. Build embeddable widget (widget.js)
16. Stripe subscription integration
17. Make everything mobile-responsive and dark mode
