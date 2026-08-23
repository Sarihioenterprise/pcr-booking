/**
 * GET /api/cron/send-return-reminders
 *
 * Daily cron: finds bookings returning tomorrow and sends return reminder
 * emails via /api/email/return-reminder.
 *
 * Also sends review request emails 24h after return (end_date = yesterday).
 *
 * Security: requires Authorization: Bearer <CRON_SECRET> header
 * Schedule: runs daily at 10:00 AM UTC (configured in vercel.json)
 *
 * Idempotency: checks notifications table to avoid re-sending.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://pcrbooking.com";

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const tomorrow = dateOffset(1);
  const yesterday = dateOffset(-1);

  let remindersSent = 0;
  let remindersSkipped = 0;
  let reviewsSent = 0;
  let reviewsSkipped = 0;
  const errors: string[] = [];

  // ── 1. Return Reminders: bookings where end_date = tomorrow ──────────────
  try {
    const { data: returnBookings, error: qErr } = await supabase
      .from("bookings")
      .select(
        `id, operator_id, renter_name, renter_email, end_date,
         vehicles(make, model, year)`
      )
      .eq("end_date", tomorrow)
      .in("status", ["active", "confirmed"])
      .not("renter_email", "is", null);

    if (qErr) {
      errors.push(`Return reminder query error: ${qErr.message}`);
    } else {
      for (const booking of returnBookings ?? []) {
        try {
          const notifLink = `/dashboard/bookings/${booking.id}:return-reminder`;

          // Idempotency check
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("operator_id", booking.operator_id)
            .eq("type", "cron_return_reminder")
            .eq("link", notifLink)
            .maybeSingle();

          if (existing) {
            remindersSkipped++;
            continue;
          }

          // Fire email
          const res = await fetch(`${BASE_URL}/api/email/return-reminder`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: booking.id }),
          });

          if (!res.ok) {
            const t = await res.text();
            errors.push(`Return reminder ${booking.id}: ${t}`);
            continue;
          }

          // Record idempotency
          await supabase.from("notifications").insert({
            operator_id: booking.operator_id,
            type: "cron_return_reminder",
            title: `Return Reminder Sent — ${booking.renter_name}`,
            message: `Return reminder email sent for booking due ${tomorrow}.`,
            link: notifLink,
            is_read: false,
          });

          remindersSent++;
        } catch (e) {
          errors.push(
            `Return reminder ${booking.id}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
    }
  } catch (e) {
    errors.push(
      `Return reminders loop: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  // ── 2. Review Requests: bookings where end_date = yesterday ─────────────
  try {
    const { data: reviewBookings, error: rErr } = await supabase
      .from("bookings")
      .select(`id, operator_id, renter_name, renter_email, end_date`)
      .eq("end_date", yesterday)
      .in("status", ["completed", "active"])
      .not("renter_email", "is", null);

    if (rErr) {
      errors.push(`Review request query error: ${rErr.message}`);
    } else {
      for (const booking of reviewBookings ?? []) {
        try {
          const notifLink = `/dashboard/bookings/${booking.id}:review-request`;

          // Idempotency check
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("operator_id", booking.operator_id)
            .eq("type", "cron_review_request")
            .eq("link", notifLink)
            .maybeSingle();

          if (existing) {
            reviewsSkipped++;
            continue;
          }

          // Fire email
          const res = await fetch(`${BASE_URL}/api/email/review-request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId: booking.id }),
          });

          if (!res.ok) {
            const t = await res.text();
            errors.push(`Review request ${booking.id}: ${t}`);
            continue;
          }

          // Record idempotency
          await supabase.from("notifications").insert({
            operator_id: booking.operator_id,
            type: "cron_review_request",
            title: `Review Request Sent — ${booking.renter_name}`,
            message: `Post-rental review request sent for booking returned ${yesterday}.`,
            link: notifLink,
            is_read: false,
          });

          reviewsSent++;
        } catch (e) {
          errors.push(
            `Review request ${booking.id}: ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
    }
  } catch (e) {
    errors.push(
      `Review requests loop: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  return NextResponse.json({
    ok: true,
    date: dateOffset(0),
    returnReminderDate: tomorrow,
    reviewRequestDate: yesterday,
    returnRemindersSent: remindersSent,
    returnRemindersSkipped: remindersSkipped,
    reviewRequestsSent: reviewsSent,
    reviewRequestsSkipped: reviewsSkipped,
    errors: errors.length > 0 ? errors : undefined,
  });
}
