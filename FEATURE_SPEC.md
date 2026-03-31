# PCR Booking — Complete Feature Spec
## Goal: Dominate HQ Rentals, Wheelbase, Navotar, TSD, Rent Centric, RentSyst, and all competitors

---

## COMPETITORS ANALYZED
- HQ Rental Software
- Wheelbase Pro
- Navotar / RENTALL
- TSD Rental Software
- Rent Centric
- Fleet Complete
- RentSyst
- Rentec Direct
- Easy Rent Pro
- Coastr

---

## MASTER FEATURE LIST (Everything to build)

### 🗓️ BOOKING & RESERVATIONS
- [ ] Real-time availability calendar (drag/drop)
- [ ] Online booking widget (embeddable on operator site)
- [ ] Multi-vehicle booking in one transaction
- [ ] Booking status workflow: Inquiry → Confirmed → Active → Completed → Cancelled
- [ ] Recurring/long-term rental support (weekly/monthly)
- [ ] Blackout dates per vehicle
- [ ] Minimum/maximum rental duration settings
- [ ] Early return handling
- [ ] Extension requests
- [ ] Waitlist management
- [ ] Instant booking vs. approval required toggle

### 💰 PAYMENTS
- [ ] Online payment collection from renters (Stripe)
- [ ] Deposit collection + auto-release
- [ ] Automated payment schedules (monthly for long-term)
- [ ] Late payment reminders
- [ ] Refund management
- [ ] Multiple payment methods (card, ACH, cash tracking)
- [ ] Automated invoicing + receipts
- [ ] Revenue splits (for partner operators)
- [ ] Promo codes / discounts
- [ ] Dynamic pricing (peak season, day of week, vehicle type)
- [ ] Weekly/monthly rate discounts
- [ ] Tax calculation + reporting

### 🚗 FLEET MANAGEMENT
- [ ] Add/edit/delete vehicles with full details (make, model, year, VIN, plate, color, odometer)
- [ ] Vehicle photos (multiple per vehicle)
- [ ] Availability status (available, rented, maintenance, reserved)
- [ ] Real-time GPS tracking integration (via API)
- [ ] Mileage tracking
- [ ] Fuel level tracking
- [ ] Vehicle categories/tags
- [ ] Vehicle documents storage (title, registration, insurance)
- [ ] Depreciation tracking
- [ ] Vehicle cost tracking (purchase price, running costs)

### 🔧 MAINTENANCE
- [ ] Maintenance log per vehicle
- [ ] Scheduled service reminders (by date and mileage)
- [ ] Service categories (oil change, tire rotation, brake service, etc.)
- [ ] Maintenance cost tracking
- [ ] Upcoming maintenance dashboard
- [ ] Status flags: OK / Due Soon / Overdue
- [ ] Vendor/mechanic records
- [ ] Integration with mechanic ticket system

### 📋 RENTAL AGREEMENTS
- [ ] Customizable agreement templates
- [ ] Auto-generate agreement per booking
- [ ] E-signature from renter (via renter portal)
- [ ] Agreement PDF generation + storage
- [ ] Signed/unsigned tracking
- [ ] Terms and conditions editor
- [ ] Multi-language support (English/Spanish)

### 🔍 INSPECTIONS & DAMAGE
- [ ] Pre-rental vehicle inspection checklist
- [ ] Post-rental vehicle inspection checklist
- [ ] Photo upload per inspection (pre/post side-by-side)
- [ ] Damage report creation
- [ ] Damage cost estimation
- [ ] Damage claim tracking
- [ ] Renter dispute management
- [ ] Inspection history per vehicle

### 👤 RENTER MANAGEMENT
- [ ] Renter profiles (name, contact, DL, history)
- [ ] Driver's license upload + verification
- [ ] Blacklist functionality
- [ ] Renter rental history
- [ ] Notes per renter
- [ ] Communication log per renter
- [ ] Renter portal (public, no login required — booking ID access)
  - View booking details
  - Upload DL
  - Sign agreement
  - Make payment
  - Submit support ticket
  - View pickup instructions

### 📊 ANALYTICS & REPORTING
- [ ] Revenue dashboard (daily/weekly/monthly/annual)
- [ ] Fleet utilization rate per vehicle
- [ ] Bookings this period vs last period
- [ ] Top performing vehicles
- [ ] Revenue by vehicle
- [ ] Revenue by renter
- [ ] Average rental duration
- [ ] Cancellation rate
- [ ] Outstanding payments report
- [ ] Tax report (exportable)
- [ ] Custom date range reports
- [ ] Export to CSV/PDF

### 🔔 NOTIFICATIONS & ALERTS
- [ ] In-app notification bell + feed
- [ ] Email notifications (new booking, payment, agreement signed)
- [ ] SMS notifications via Twilio
- [ ] Notification types: new booking, payment received, maintenance due, agreement signed, ticket opened, DL uploaded, booking expiring
- [ ] Operator notification preferences settings
- [ ] Renter booking confirmation email/SMS

### 🎫 SUPPORT TICKET SYSTEM
- [ ] Renter submits ticket from portal
- [ ] Operator views/responds from dashboard
- [ ] Ticket status: Open / In Progress / Resolved
- [ ] Priority levels
- [ ] Attachment support
- [ ] Email notification on ticket update

### 📍 MULTI-LOCATION
- [ ] Multiple pickup/dropoff locations per operator
- [ ] Location-based availability
- [ ] Location-specific pricing
- [ ] Inter-location transfers

### 🤝 AFFILIATE & REFERRAL
- [ ] Affiliate registration + tracking (already built)
- [ ] Commission management
- [ ] Payout tracking
- [ ] Affiliate dashboard with referral stats

### 🔌 INTEGRATIONS
- [ ] Stripe (payments) — built
- [ ] Twilio (SMS notifications)
- [ ] VAPI AI calling bot — built
- [ ] QuickBooks / accounting export
- [ ] Google Calendar sync
- [ ] Zapier webhook support
- [ ] GPS tracking API (Samsara, Bouncie, etc.)
- [ ] Insurance verification API
- [ ] Background check API (optional)

### 📱 MOBILE / PWA
- [ ] Progressive Web App (installable on phone)
- [ ] Mobile-optimized dashboard
- [ ] Camera integration for inspection photos
- [ ] Offline mode for inspections

### ⚙️ OPERATOR SETTINGS
- [ ] Business profile + branding
- [ ] Custom subdomain (operator.pcrbooking.com)
- [ ] Email template customization
- [ ] Notification preferences
- [ ] Payment settings
- [ ] Tax settings
- [ ] User roles (owner, manager, staff)
- [ ] API access keys

---

## PCR BOOKING EXCLUSIVE FEATURES (Things competitors don't have)
- ✅ Built-in AI calling bot (Sarah — calls leads in 60 seconds)
- ✅ Affiliate network built-in from day one
- ✅ Designed specifically for Uber/Lyft driver rental market
- 🔲 AI-powered lead scoring
- 🔲 Automated follow-up sequences for unconverted leads
- 🔲 Driver earnings estimator (show renters how much they can make)
- 🔲 Turo/Getaround migration tool (import existing listings)
