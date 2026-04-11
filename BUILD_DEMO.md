Build a product demo/tour page for PCR Booking at /Users/igrisknight/.openclaw/workspace/pcr-booking.

## TASK: Create app/tour/page.tsx

This page shows visitors what the inside of PCR Booking looks like BEFORE they sign up. It replaces the missing Loom video and converts skeptical visitors into trial signups.

Design: Match the dark marketing site (#080812 bg, white text, #2EBD6B accents). NOT the light dashboard style.

## PAGE STRUCTURE:

### Nav
Same nav as the homepage (copy from app/page.tsx) with "Product Tour" highlighted as active.

### Hero Section
Headline: "See PCR Booking in Action"
Subheadline: "A complete walkthrough of the platform — no signup required."
Small CTA: "Ready to try it? [Start Free →]" (link to /auth/signup)

### Section 1: "Your Dashboard at a Glance"
Fake dashboard screenshot mockup built with HTML/Tailwind (no actual image needed). 
Create a realistic-looking dashboard preview using divs:
- Dark sidebar (#0c0c1c) with nav items listed (Dashboard, Bookings, Fleet, Renters, Payments, Support, Analytics)
- Main area showing 4 stat cards: "12 Active Rentals", "$4,280 This Month", "3 Pending Payments", "8 Vehicles in Fleet"
- A mini bar chart (just CSS bars, no library) showing "Revenue Last 7 Days"
- Style it to LOOK like a screenshot with a browser chrome frame around it (rounded top with three dots)

Callout bullets next to it:
- "See all your active rentals at a glance"
- "Track monthly revenue in real time"  
- "Spot overdue payments instantly"

### Section 2: "Manage Your Entire Fleet"
Another HTML mockup of the fleet page:
- A table with 4 sample vehicles:
  - 2022 Honda Accord | Plate: GHT-4421 | $350/wk | ● Available
  - 2021 Toyota Camry | Plate: JKL-8832 | $325/wk | ● Rented
  - 2023 Hyundai Elantra | Plate: MNP-2291 | $300/wk | ● Available
  - 2020 Nissan Altima | Plate: QRS-7754 | $295/wk | ● Maintenance
- Green dot for available, blue for rented, orange for maintenance
- "Add Vehicle" button in top right

Callout bullets:
- "Track every vehicle — availability, rates, and status"
- "Set daily, weekly, or monthly rates"
- "Toggle availability with one click"

### Section 3: "Booking Widget — Embed on Any Website"
Show a mockup of the booking widget as it would appear on a customer's website:
- Simple form: "Select Vehicle" dropdown, "Start Date" date input, "End Date" date input, "Your Name" text, "Phone" text, "Submit Booking Request" green button
- Styled cleanly, looks like it's on a white website background
- Small badge: "Powered by PCR Booking" at bottom

Text next to it:
Headline: "Your renters book directly — no middleman"
Body: "Paste one line of code on your website. Or share your direct booking link — no website required. Bookings flow straight into your dashboard."

### Section 4: "Renter Management"
HTML mockup of the renters list:
- 5 sample renters with status badges:
  - Marcus Johnson | ★★★★★ | Active Renter | Current since Jan 2026
  - Darius Williams | ★★★★☆ | Active Renter | 14 rentals
  - Keisha Brown | ★★★★★ | VIP Renter | 28 rentals — most reliable
  - Andre Thompson | ★★☆☆☆ | Flagged | 2 late payments
  - Tamika Davis | ★★★☆☆ | Completed | Last rental Feb 2026
- Green for active/VIP, red for flagged, gray for completed

Callout bullets:
- "Every renter's full history in one place"
- "Flag unreliable renters, protect your fleet"
- "See who your best customers are"

### Section 5: "Automated Payments & Collections"
HTML mockup showing the payments/collections view:
- A list of payment schedule items:
  - Marcus Johnson | Week of Apr 7 | $350 | ✅ Paid
  - Darius Williams | Week of Apr 7 | $325 | ✅ Paid
  - Andre Thompson | Week of Apr 7 | $295 | ⚠️ 3 Days Overdue — SMS Reminder Sent
  - Keisha Brown | Week of Apr 14 | $350 | 🔵 Upcoming

Callout bullets:
- "Automated SMS reminders before payments are due"
- "Late payment sequences run automatically — you don't lift a finger"
- "Late fees calculated and charged automatically"

### Section 6: "Digital Rental Agreements"
Simple visual: show a document with PCR Booking header, "Rental Agreement", signature line with a green checkmark "Signed electronically — Apr 8, 2026 at 2:34 PM"

Callout bullets:
- "Renters sign agreements digitally — no printing"
- "Timestamped and stored securely"
- "Auto-sent when booking is confirmed"

### Final CTA Section
Dark bg, centered:
Headline: "Ready to run your rental business the right way?"
Subhead: "Join operators who've stopped using spreadsheets and started growing."
Two buttons:
- [Start Free — No Credit Card] → /auth/signup (green, primary)
- [See Pricing →] → /pricing (outline)

Small text: "Free plan available. Paid plans start at $79/mo."

## NAVIGATION UPDATES

In app/page.tsx, add "Product Tour" to the desktop nav links (before "Pricing"):
href="/tour", label="Product Tour"

Also add to footer under Product section:
- Product Tour → /tour

## After completing:
git add -A && git commit -m "feat: product tour/demo page showing dashboard, fleet, bookings, payments, agreements"

When completely finished run:
openclaw system event --text "Done: Product tour page live at pcrbooking.com/tour — showing dashboard, fleet, renters, payments, agreements mockups" --mode now
