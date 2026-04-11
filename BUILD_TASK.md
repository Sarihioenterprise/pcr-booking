Build these 3 features for PCR Booking:

## TASK 1: Competitor Research Cron
Create app/api/cron/competitor-research/route.ts

GET handler secured with CRON_SECRET. It:

1. Uses Brave Search API (process.env.BRAVE_SEARCH_API_KEY) to search for:
   - "RentCentric problems complaints 2025"
   - "RentCentric alternative reddit"
   - "car rental software complaints reddit"
   - "Fleetio car rental problems"
   - "car rental management software feature request"
   - "private rental car software missing features"
   
   API endpoint: https://api.search.brave.com/res/v1/web/search?q={query}&count=5
   Header: X-Subscription-Token: {BRAVE_SEARCH_API_KEY}

2. Extracts titles + descriptions from results

3. Saves markdown report to /Users/igrisknight/.openclaw/workspace/competitor-intel/latest.md with:
   - Date generated
   - Competitor complaints found
   - Feature requests mentioned
   - Opportunities for PCR Booking

4. Returns { success: true, opportunitiesFound: number }

Add to vercel.json crons (merge with existing):
{ "path": "/api/cron/competitor-research", "schedule": "0 9 * * 1" }

Check .env.local for BRAVE_SEARCH_API_KEY — if not there add placeholder: BRAVE_SEARCH_API_KEY=placeholder

## TASK 2: Renter Blacklist Booking Block
In app/api/book/request/route.ts, after getting the operator and before creating the booking/lead:
- Query Supabase: check if any renter with matching email OR phone exists in a blacklisted_renters table for this operator
- If found, return 400 with JSON: { error: "Unable to process booking request." }
- The blacklisted_renters table may not exist — if not, skip this check silently (wrap in try/catch)

## TASK 3: Onboarding Checklist on Dashboard
In app/dashboard/page.tsx:
- Import and render an OnboardingChecklist component at the TOP of the page content, before other dashboard content
- Create components/dashboard/onboarding-checklist.tsx as a CLIENT component

The checklist:
- Uses localStorage key "pcr_onboarding_v1" to track dismissed state
- Shows a card with title "Get Started with PCR Booking" and 4 steps:
  1. "Add your first vehicle" → href="/dashboard/fleet/new"
  2. "Set up your booking widget" → href="/dashboard/settings/widget"  
  3. "Share your booking link" → show text "Share pcrbooking.com/book/[your-slug] with renters"
  4. "Get your first booking" → href="/dashboard/bookings"
- Each step shows a green checkmark if done, gray circle if not
- For step 1: check via a prop (pass hasVehicles boolean from the server page)
- For step 2, 3, 4: just show as unchecked (client-side, no DB check needed for simplicity)
- Show an "X" dismiss button in the top right — clicking it sets localStorage and hides the checklist permanently
- If localStorage shows dismissed, render nothing (return null)
- Style: white card, green (#2EBD6B) accents, subtle shadow, clean

In app/dashboard/page.tsx (server component):
- Query count of vehicles for this operator
- Pass hasVehicles={count > 0} to the OnboardingChecklist component

After all tasks:
git add -A && git commit -m "feat: competitor intel cron, blacklist booking block, onboarding checklist"

When completely finished, run:
openclaw system event --text "Done: Competitor research cron, blacklist protection, onboarding checklist — committed and ready to deploy" --mode now
