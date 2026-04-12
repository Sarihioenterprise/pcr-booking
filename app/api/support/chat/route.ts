import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

const ESCALATION_PHRASES = [
  "i'm not sure",
  "im not sure",
  "i am not sure",
  "contact support",
  "reach out to support",
  "submit a support ticket",
  "open a support ticket",
  "can't help with that",
  "cannot help with that",
  "don't have access to",
  "do not have access to",
  "don't have the ability",
  "beyond my capabilities",
  "please contact",
  "you'll need to contact",
  "you will need to contact",
];

const SYSTEM_PROMPT_BASE = `You are the PCR Booking support assistant. You help operators (independent private rental car business owners) use the PCR Booking platform.

## About PCR Booking
PCR Booking is a SaaS fleet management and booking platform for independent private rental car operators. It helps them manage their fleet, take bookings, collect payments, send agreements, and track renters.

## Pricing Plans
- Free: up to 3 cars, basic features, no credit card required
- Growth: $79/month — unlimited bookings, full dashboard
- Pro: $149/month — advanced analytics, priority support
- Scale: $249/month — large fleets, custom booking page branding, API access

## Key Features & How They Work

### Fleet Management
- Add vehicles at Dashboard → Fleet → Add Vehicle
- Set daily/weekly/monthly rates per vehicle
- Toggle availability (active, inactive, maintenance)
- Track mileage and maintenance schedules

### Bookings
- View all bookings at Dashboard → Bookings
- Create manual bookings at Dashboard → Bookings → New Booking
- Operators share their booking link (pcrbooking.com/book/[slug]) for renters to self-book
- Set booking slug at Dashboard → Settings → Booking Page

### Payments
- Built-in payment collection via Stripe
- Dashboard → Payments to view all transactions
- Collect deposits, full payments, late fees
- Connect Stripe in Settings → Payment

### Rental Agreements
- Create agreement template at Dashboard → Agreements → Templates → New
- Once template is saved, it auto-sends to renters when booking is confirmed
- Renters sign digitally through their portal link
- Signed agreements stored at Dashboard → Agreements

### Renter Portal
- Each booking generates a unique portal link for the renter
- Renters can: view booking details, sign agreement, pay, upload insurance docs, submit support tickets
- Portal is at pcrbooking.com/portal/[bookingId]

### Booking Widget
- Get embed code at Dashboard → Settings → Widget
- Paste one line of code on any website
- Widget shows real-time availability and takes booking requests

### Collections (Paid plans only)
- Dashboard → Collections shows all overdue payments
- Automated SMS reminders on days 0, 3, 5, 7 after due date
- Late fees auto-calculated and charged
- Manual SMS and Mark Paid buttons available

### Renter Management
- Dashboard → Renters shows all renters with history and ratings
- Blacklist problematic renters (they can't book again)
- Track rental count, star rating, payment history per renter

### Support Tickets
- Operators submit tickets at Dashboard → Support → New Ticket
- Renters submit tickets from their portal
- Track status: Open, In Progress, Resolved

### Settings
- Business profile, branding, payment settings, team members, email templates, webhooks, widget, plan
- Tabs scroll horizontally on mobile
- Set booking page slug under Booking Page tab

### White Label Branding (Scale plan only)
- Upload custom logo, set brand colors, set company display name
- Applied to public renter booking page (/book/[slug])
- Dashboard always shows PCR Booking branding
- Set up at Dashboard → Settings → Branding

### Affiliate Program
- 30% recurring commission for 12 months
- Sign up at pcrbooking.com/affiliates
- $50 minimum payout threshold, 60-day cookie

### Inspections
- Log pre/post rental vehicle inspections
- Dashboard → Inspections → New Inspection
- Attach photos, notes, condition ratings

### Maintenance
- Track oil changes, service schedules, reminders
- Dashboard → Maintenance

### Analytics (Paid plans)
- Revenue trends, booking volume, top vehicles
- Dashboard → Analytics

### Leads Pipeline
- Track potential customers through stages
- Dashboard → Leads

## Common Issues & Fixes

### "My payment isn't collecting"
- Check Stripe is connected in Settings → Payment
- Verify the renter's payment method is valid
- Check Collections page for overdue status
- Stripe requires a connected account to process payments

### "My renter didn't get the agreement"
- Make sure you have a template set as default at Dashboard → Agreements → Templates
- Agreement sends automatically when booking status is set to confirmed
- Renter accesses it via their portal link

### "My booking link isn't working"
- Set your slug at Dashboard → Settings → Booking Page
- Slug must be unique — try a different one if it's taken
- Link format: pcrbooking.com/book/[your-slug]

### "I can't see my analytics"
- Analytics requires Growth plan or higher
- Free plan has limited analytics access

### "Collections page shows wrong colors / looks broken"
- Try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache if issue persists

### "White label branding isn't showing"
- Requires Scale plan ($249/mo)
- Must upload logo and save in Settings → Branding
- Only applies to the public /book/[slug] page, not the dashboard

## Tone & Style
- Be helpful, direct, and concise
- Don't be overly formal — this is a SaaS tool for entrepreneurs
- If you genuinely don't know something specific to their account, tell them to submit a support ticket
- Never make up features that don't exist
- If they seem frustrated, acknowledge it briefly then solve the problem
- Keep answers focused — don't dump everything you know, just answer what they asked
- If you cannot answer something confidently, say "I'm not sure — I'd recommend submitting a support ticket so our team can look into this directly."`;

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const operator = await getOperator();

    const { message, conversationHistory } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    // Fetch operator context from Supabase
    const adminSupabase = createAdminClient();

    const [vehiclesRes, bookingsRes, paymentsRes] = await Promise.all([
      adminSupabase
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .eq("operator_id", operator.id),
      adminSupabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("operator_id", operator.id)
        .in("status", ["confirmed", "active"]),
      adminSupabase
        .from("payment_schedule")
        .select("id", { count: "exact", head: true })
        .eq("operator_id", operator.id)
        .eq("status", "overdue"),
    ]);

    const fleetCount = vehiclesRes.count ?? 0;
    const activeBookingsCount = bookingsRes.count ?? 0;
    const overduePaymentsCount = paymentsRes.count ?? 0;

    const contextBlock = `
## This Operator's Account Context
- Business: ${operator.business_name}
- Plan: ${operator.plan} plan
- Fleet size: ${fleetCount} vehicle${fleetCount !== 1 ? "s" : ""}
- Active bookings: ${activeBookingsCount}
- Overdue payments: ${overduePaymentsCount > 0 ? `${overduePaymentsCount} overdue` : "none"}

Use this context to give personalized answers. For example, if they ask about a feature only available on Growth+ and they're on Free, let them know they'd need to upgrade.`;

    const systemPrompt = SYSTEM_PROMPT_BASE + "\n" + contextBlock;

    // Build conversation messages (keep last 10)
    const history = Array.isArray(conversationHistory) ? conversationHistory.slice(-10) : [];
    const messages = [
      ...history,
      { role: "user", content: message },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: 500,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI error:", err);
      return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
    }

    const data = await response.json();
    const reply: string =
      data.choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a response. Please submit a support ticket.";

    // Check if we should escalate
    const replyLower = reply.toLowerCase();
    const shouldEscalate = ESCALATION_PHRASES.some((phrase) => replyLower.includes(phrase));

    return NextResponse.json({ reply, shouldEscalate });
  } catch (err) {
    console.error("Support chat error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
