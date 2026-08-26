/**
 * GET /api/cron/nurture-pcr-booking
 *
 * Daily cron: sends the PCR Booking trial nurture email sequence.
 * Sequence fires on days 1, 3, 10, 13, 15 after trial_started_at.
 *
 * Security: requires Authorization: Bearer <CRON_SECRET> header
 * Schedule: 0 12 * * * (noon UTC daily, via vercel.json)
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/ghl";

// Nurture sequence: day number → email content
const NURTURE_EMAILS: Record<number, { subject: string; body: string }> = {
  1: {
    subject: "Your trial is live — do this first",
    body: `Your PCR Booking trial is active. Here's the one thing to do right now:

Add your first vehicle and connect your availability. Takes about 5 minutes.

Once it's in the system, you'll see exactly what the dashboard looks like when a booking comes in — no back-and-forth texts, no spreadsheet updates, no manual tracking.

If you hit anything weird during setup, reply to this email. I check it.

– Alton
Founder, PCR Booking

<a href="https://pcrbooking.com/dashboard">Set Up Your Fleet →</a>`,
  },
  3: {
    subject: "Are you taking direct bookings yet?",
    body: `Quick check-in — have you set up your direct booking link?

It's the part most operators sleep on during the trial, then wish they'd used from day one.

Your booking link lets customers book directly with you. No Turo cut. No platform risk. Just a clean booking flow with your name on it.

You can have it live in 10 minutes. Go to Settings → Direct Booking → Copy your link. Drop it in your Instagram bio, your Google Business page, anywhere.

Every direct booking you land this month pays for the software multiple times over.

– Alton

<a href="https://pcrbooking.com/dashboard">Activate Direct Booking →</a>`,
  },
  10: {
    subject: "What does your operation look like right now?",
    body: `You're 10 days in. Honest question: what's different?

If you've been using the dashboard, you should have a cleaner picture of your fleet right now than you've had in months — availability, bookings, revenue, all in one place.

If you haven't gotten in yet, this week is the time. Trial ends in 5 days.

The operators who convert to paid aren't doing it because of the price. They're doing it because they've seen what it feels like to not chase down a booking confirmation over text at 11pm.

Log in. Run through a booking. See it.

– Alton

<a href="https://pcrbooking.com/dashboard">Open Your Dashboard →</a>`,
  },
  13: {
    subject: "2 days left on your trial",
    body: `Trial ends Thursday.

If PCR Booking is working for you — keep it. Growth starts at $79/month. Less than two direct bookings covers the cost.

If you haven't activated yet and want a walkthrough before you decide, reply to this and I'll get on a call with you today or tomorrow.

No pressure to convert if it's not the right fit. But if the only thing stopping you is a question, let's answer it now.

– Alton

<a href="https://pcrbooking.com/billing">Keep My Account →</a>`,
  },
  15: {
    subject: "Trial ended — one offer before you go",
    body: `Your trial is over, but your account isn't deleted yet.

If you're ready to keep going: reactivate today and I'll drop you to annual pricing — that's 2 months free compared to monthly.

Growth: $790/yr (save $158)
Pro: $1,490/yr (save $298)
Scale: $2,490/yr (save $498)

This offer is only good today. Tomorrow the account locks and standard monthly pricing applies when you come back.

If the timing just isn't right, no problem — reply and tell me what's in the way. I'd rather know than guess.

– Alton

<a href="https://pcrbooking.com/billing">Reactivate + Claim Annual Rate →</a>`,
  },
};

const NURTURE_DAYS = [1, 3, 10, 13, 15];

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  // Fetch all active nurture records (not stopped)
  const { data: records, error } = await supabase
    .from("pcr_booking_nurture")
    .select("*")
    .is("stopped_at", null);

  if (error) {
    console.error("[nurture-cron] Failed to fetch nurture records:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const record of records ?? []) {
    if (!record.ghl_contact_id) {
      skipped++;
      continue;
    }

    const trialStart = new Date(record.trial_started_at);
    const daysSinceStart = Math.floor(
      (now.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    const emailsSent: number[] = record.emails_sent ?? [];
    const newlySent: number[] = [];

    for (const day of NURTURE_DAYS) {
      if (daysSinceStart >= day && !emailsSent.includes(day)) {
        const emailContent = NURTURE_EMAILS[day];
        if (!emailContent) continue;

        const subject = record.first_name
          ? emailContent.subject
          : emailContent.subject;

        const ok = await sendEmail(record.ghl_contact_id, {
          subject,
          body: emailContent.body,
          fromName: "Alton",
          fromEmail: "alton@pcrbooking.com",
        });

        if (ok) {
          newlySent.push(day);
          sent++;
          console.log(`[nurture-cron] Day ${day} email sent to ${record.email}`);
        } else {
          errors++;
          console.error(`[nurture-cron] Day ${day} email failed for ${record.email}`);
        }
      }
    }

    if (newlySent.length > 0) {
      const updatedSent = [...new Set([...emailsSent, ...newlySent])].sort((a, b) => a - b);
      await supabase
        .from("pcr_booking_nurture")
        .update({ emails_sent: updatedSent })
        .eq("id", record.id);
    }
  }

  console.log(`[nurture-cron] Done. sent=${sent} skipped=${skipped} errors=${errors}`);
  return NextResponse.json({ ok: true, sent, skipped, errors, total: records?.length ?? 0 });
}
