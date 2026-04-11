Build pricing upgrade triggers for PCR Booking at /Users/igrisknight/.openclaw/workspace/pcr-booking.

## TASK 1: Upgrade Prompt Component

Create components/dashboard/upgrade-prompt.tsx — a reusable modal/banner component.

Props:
- trigger: string (what caused the prompt, e.g. "vehicle_limit")
- currentPlan: string
- headline: string
- body: string  
- upgradeTo: "growth" | "pro" | "scale"
- onDismiss: () => void

Design: Clean modal overlay. Green accent. Shows:
- Headline (bold, large)
- Body text
- Two buttons: "[Upgrade to {plan}]" (green, primary) + "Maybe Later" (ghost)
- Upgrade button → /onboarding/plan

## TASK 2: Vehicle Limit Upgrade Trigger

In app/dashboard/fleet/new/page.tsx:
- This is a server component — make the vehicle count check server-side
- Fetch operator plan and current vehicle count from Supabase
- Plan limits: free=3, growth=15, pro=40, scale=999999
- If count >= limit: instead of showing the new vehicle form, show an upgrade prompt:
  - For free at limit: "You've added 3 vehicles — upgrade to Growth to manage up to 15, plus unlock automated payment reminders and SMS notifications."
  - For growth at limit: "You're at 15 vehicles — upgrade to Pro to manage up to 40, plus unlock revenue analytics and collections automation."
  - For pro at limit: "You're at 40 vehicles — upgrade to Scale for unlimited vehicles, white-label branding, and API access."
  - Show a styled card with the message and "Upgrade Now" button → /onboarding/plan

## TASK 3: Analytics Upgrade Gate (Growth users)

In app/dashboard/analytics/analytics-client.tsx:
- Check if operator plan is "free" (free plan)
- If free plan: show a blurred/locked overlay over the analytics charts with:
  "Unlock Analytics — Upgrade to Growth ($79/mo) to see revenue trends, booking analytics, and vehicle performance."
  [Upgrade to Growth] button

## TASK 4: Collections Upgrade Gate (Free users)

In app/dashboard/collections/page.tsx:
- If operator plan is "free": show upgrade gate instead of collections data:
  "Automated Collections is a Growth feature. Upgrade to stop chasing late payments — automated SMS reminders and late fee charging run themselves."
  [Upgrade to Growth — $79/mo] button

## TASK 5: Add "Product Tour" to homepage nav

In app/page.tsx, find the desktop nav links section and add "Product Tour" link:
href="/tour", label="Product Tour"

Add it between "Features" and "Pricing" in the nav list.

Also add to the footer under Product section.

After all tasks:
git add -A && git commit -m "feat: vehicle limit upgrade triggers, analytics/collections gates, product tour nav link"

When completely finished run:
openclaw system event --text "Done: Upgrade triggers (vehicle limit, analytics gate, collections gate), product tour in nav — committed" --mode now
