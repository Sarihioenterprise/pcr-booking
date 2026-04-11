Build these critical pre-launch features for PCR Booking at /Users/igrisknight/.openclaw/workspace/pcr-booking:

## TASK 1: Direct Shareable Booking Link

Many operators don't have websites. They need a direct link to share on WhatsApp, Facebook, etc.

Create app/rent/[slug]/page.tsx — this is a PUBLIC page (no auth) that shows:
- The operator's fleet of available vehicles
- Each vehicle: photo (if any), make/model/year, daily/weekly rate, availability
- A "Book This Vehicle" button per car that opens the booking form
- Operator's business name at the top
- Clean, mobile-first design (dark theme, green accents matching the brand)
- If slug not found, show "This rental page is not available"

The slug should match the operator's existing booking slug (already in the operators table or bookings table — check the schema).

In app/dashboard/settings/widget/page.tsx:
- Add a section "Your Direct Booking Link" showing:
  pcrbooking.com/rent/[their-slug]
- Copy to clipboard button
- "Share this link with renters on WhatsApp, Facebook, or by text. No website needed."

## TASK 2: Onboarding Wizard for New Users

Create app/dashboard/onboarding/page.tsx — a multi-step onboarding wizard:

Step 1: "Add your first vehicle"
- Fields: Year, Make, Model, License Plate, Weekly Rate, Daily Rate
- Photo upload (optional — just a URL field for now)
- "Save & Continue" button → creates vehicle via Supabase, moves to step 2

Step 2: "Set up your booking page"  
- Show a preview of their booking widget
- Show their direct link: pcrbooking.com/rent/[slug]
- Copy link button
- Embed code (textarea with the widget script)
- "Looks good!" button → moves to step 3

Step 3: "You're ready to take bookings!"
- Summary of what they set up
- Big green checkmark
- 3 next steps listed:
  1. Share your booking link on Facebook Marketplace and WhatsApp
  2. Add more vehicles to your fleet
  3. Set up payment reminders in Settings
- "Go to Dashboard" button → /dashboard

Style: Clean wizard with step indicators at top (1 of 3, 2 of 3, etc.), green progress bar, white cards on light gray background.

Redirect new users here: In app/auth/onboarding/page.tsx, after the operator profile is created successfully, redirect to /dashboard/onboarding instead of /onboarding/plan (for FREE plan users — paid plan users still go through checkout).

## TASK 3: Upgrade Trigger — Vehicle Limit

In app/dashboard/fleet/new/page.tsx (or wherever new vehicles are added):
Check the operator's current vehicle count vs their plan limit:
- Free: 3
- Growth: 15  
- Pro: 40
- Scale: unlimited

If they're AT the limit and try to add one more, show a modal/banner:
"You've reached your [Plan] limit of [X] vehicles. Upgrade to [Next Plan] to add more vehicles and unlock [key feature]."

With upgrade button → /onboarding/plan

## TASK 4: ROI Calculator on Homepage

Add an interactive ROI calculator section to app/page.tsx, insert it before the Pricing section.

The calculator:
- "How many vehicles do you rent?" — number input, default 5
- "Average weekly rate per vehicle?" — number input, default $350
- "Hours per week on admin/paperwork?" — number input, default 8

Output (calculates live as user types):
- "Monthly revenue: $X"
- "PCR Booking cost: $79/mo" (or free if <3 cars)
- "Hours saved per month: ~X hrs (at $25/hr = $Y saved)"
- "Late payments recovered (avg 34% improvement): $Z/mo"
- Big green callout: "Your ROI: $[total saved + recovered] per month vs $79"

Style: Dark card (#0c0c1c), green numbers for the positive outputs, simple and clean.

After all tasks:
git add -A && git commit -m "feat: direct booking link, onboarding wizard, vehicle limit upgrade trigger, ROI calculator"

When completely finished run:
openclaw system event --text "Done: Direct booking link, onboarding wizard, vehicle limit upgrade modal, ROI calculator — committed and ready to deploy" --mode now
