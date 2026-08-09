/**
 * GET /api/cron/reminders
 *
 * Daily cron job: sends pickup and return reminder emails for upcoming bookings.
 * Runs at 9:00 AM UTC daily via Vercel Cron (configured in vercel.json).
 *
 * Logic:
 *   - Pickup reminder: sent 24h before start_date (i.e., start_date = tomorrow)
 *     for bookings with status: confirmed, active
 *   - Return reminder: sent on the return day (i.e., end_date = today)
 *     for bookings with status: active
 *
 * Idempotency:
 *   - Primary: notifications table lookup (type=reminder_pickup|reminder_return, link=booking URL)
 *   - Secondary: reminder_sent_pickup/return columns (after migration 016_tier1_features.sql)
 *
 * Security: requires Authorization: Bearer <CRON_SECRET> header
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PICKUP_STATUSES = ["confirmed", "active"];
const RETURN_STATUSES = ["active"];

function getDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function today(): string { return getDateOffset(0); }
function tomorrow(): string { return getDateOffset(1); }

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pcrbooking.com";
  const todayStr = today();
  const tomorrowStr = tomorrow();

  let pickupSent = 0;
  let returnSent = 0;
  let pickupSkipped = 0;
  let returnSkipped = 0;
  const errors: string[] = [];

  // ── 1. Pickup Reminders (start_date = tomorrow) ──────────────────────────
  try {
    // Note: Do NOT select reminder_sent_pickup here — column may not exist yet (pre-migration)
    // Idempotency is handled via the notifications table lookup below
    const { data: pickupBookings, error: pickupError } = await supabase
      .from("bookings")
      .select(`
        id, operator_id, renter_name, renter_email, start_date, end_date,
        duration_days, total_price,
        vehicles(make, model, year),
        operators(business_name, business_email)
      `)
      .eq("start_date", tomorrowStr)
      .in("status", PICKUP_STATUSES);

    if (pickupError) {
      errors.push(`Pickup query error: ${pickupError.message}`);
    } else {
      for (const booking of pickupBookings || []) {
        try {
          const bookingLink = `/dashboard/bookings/${booking.id}`;

          // Primary idempotency: notifications table lookup
          const { data: existingNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("operator_id", booking.operator_id)
            .eq("type", "reminder_pickup")
            .eq("link", bookingLink)
            .maybeSingle();

          if (existingNotif) {
            pickupSkipped++;
            continue;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const vehicleArr = booking.vehicles as any;
          const vehicle = Array.isArray(vehicleArr) ? vehicleArr[0] : vehicleArr;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const opArr = booking.operators as any;
          const op = Array.isArray(opArr) ? opArr[0] : opArr;
          const vehicleLabel = vehicle
            ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
            : "your rental vehicle";
          const operatorName = op?.business_name || "PCR Booking";

          // Send to renter
          if (booking.renter_email) {
            await sendEmail(baseUrl, {
              to: booking.renter_email,
              subject: `Reminder: Your rental starts tomorrow — ${vehicleLabel}`,
              body: `<p>Hi ${booking.renter_name},</p>
<p>This is a friendly reminder that your rental begins <strong>tomorrow, ${formatDate(booking.start_date)}</strong>.</p>
<p><strong>Vehicle:</strong> ${vehicleLabel}</p>
<p><strong>Rental Period:</strong> ${formatDate(booking.start_date)} – ${formatDate(booking.end_date)} (${booking.duration_days} days)</p>
<p>Please ensure you are ready for pickup. If you have any questions, contact ${operatorName} directly.</p>
<p>Thank you for choosing ${operatorName}!</p>`,
              templateType: "pickup_reminder",
            });
          }

          // Send to operator
          if (op?.business_email) {
            await sendEmail(baseUrl, {
              to: op.business_email,
              subject: `Pickup Reminder: ${booking.renter_name} — ${vehicleLabel} tomorrow`,
              body: `<p>Pickup reminder for tomorrow:</p>
<p><strong>Renter:</strong> ${booking.renter_name}</p>
<p><strong>Vehicle:</strong> ${vehicleLabel}</p>
<p><strong>Start Date:</strong> ${formatDate(booking.start_date)}</p>
<p><strong>End Date:</strong> ${formatDate(booking.end_date)}</p>
<p><a href="${baseUrl}/dashboard/bookings/${booking.id}">View booking &rarr;</a></p>`,
              templateType: "operator_pickup_reminder",
            });
          }

          // Secondary idempotency: update column (if migration has run)
          try {
            await supabase
              .from("bookings")
              .update({ reminder_sent_pickup: true } as Record<string, unknown>)
              .eq("id", booking.id);
          } catch { /* non-fatal — column may not exist yet */ }

          // Record in notifications (primary idempotency + dashboard visibility)
          try {
            await supabase.from("notifications").insert({
              operator_id: booking.operator_id,
              type: "reminder_pickup",
              title: `Pickup Reminder Sent — ${booking.renter_name}`,
              message: `Pickup reminder sent for ${vehicleLabel} on ${formatDate(booking.start_date)}.`,
              link: bookingLink,
              is_read: false,
            });
          } catch { /* non-fatal */ }

          pickupSent++;
        } catch (bookingErr) {
          errors.push(`Pickup booking ${booking.id}: ${bookingErr instanceof Error ? bookingErr.message : String(bookingErr)}`);
        }
      }
    }
  } catch (err) {
    errors.push(`Pickup loop error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 2. Return Reminders (end_date = today) ────────────────────────────────
  try {
    const { data: returnBookings, error: returnError } = await supabase
      .from("bookings")
      .select(`
        id, operator_id, renter_name, renter_email, start_date, end_date,
        duration_days, total_price,
        vehicles(make, model, year),
        operators(business_name, business_email)
      `)
      .eq("end_date", todayStr)
      .in("status", RETURN_STATUSES);

    if (returnError) {
      errors.push(`Return query error: ${returnError.message}`);
    } else {
      for (const booking of returnBookings || []) {
        try {
          const bookingLink = `/dashboard/bookings/${booking.id}`;

          // Idempotency check
          const { data: existingNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("operator_id", booking.operator_id)
            .eq("type", "reminder_return")
            .eq("link", bookingLink)
            .maybeSingle();

          if (existingNotif) {
            returnSkipped++;
            continue;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const vehicleArr = booking.vehicles as any;
          const vehicle = Array.isArray(vehicleArr) ? vehicleArr[0] : vehicleArr;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const opArr = booking.operators as any;
          const op = Array.isArray(opArr) ? opArr[0] : opArr;
          const vehicleLabel = vehicle
            ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
            : "your rental vehicle";
          const operatorName = op?.business_name || "PCR Booking";

          // Send to renter
          if (booking.renter_email) {
            await sendEmail(baseUrl, {
              to: booking.renter_email,
              subject: `Reminder: Return ${vehicleLabel} today`,
              body: `<p>Hi ${booking.renter_name},</p>
<p>This is a reminder that your rental ends <strong>today, ${formatDate(booking.end_date)}</strong>.</p>
<p><strong>Vehicle:</strong> ${vehicleLabel}</p>
<p>Please ensure the vehicle is returned on time. If you need an extension, contact ${operatorName} as soon as possible to avoid late fees.</p>
<p>Thank you for choosing ${operatorName}!</p>`,
              templateType: "return_reminder",
            });
          }

          // Send to operator
          if (op?.business_email) {
            await sendEmail(baseUrl, {
              to: op.business_email,
              subject: `Return Due Today: ${booking.renter_name} — ${vehicleLabel}`,
              body: `<p>Return reminder for today:</p>
<p><strong>Renter:</strong> ${booking.renter_name}</p>
<p><strong>Vehicle:</strong> ${vehicleLabel}</p>
<p><strong>Return Date:</strong> ${formatDate(booking.end_date)}</p>
<p><a href="${baseUrl}/dashboard/bookings/${booking.id}">View booking &rarr;</a></p>`,
              templateType: "operator_return_reminder",
            });
          }

          // Secondary idempotency: update column (if migration has run)
          try {
            await supabase
              .from("bookings")
              .update({ reminder_sent_return: true } as Record<string, unknown>)
              .eq("id", booking.id);
          } catch { /* non-fatal — column may not exist yet */ }

          try {
            await supabase.from("notifications").insert({
              operator_id: booking.operator_id,
              type: "reminder_return",
              title: `Return Reminder Sent — ${booking.renter_name}`,
              message: `Return reminder sent for ${vehicleLabel} due ${formatDate(booking.end_date)}.`,
              link: bookingLink,
              is_read: false,
            });
          } catch { /* non-fatal */ }

          returnSent++;
        } catch (bookingErr) {
          errors.push(`Return booking ${booking.id}: ${bookingErr instanceof Error ? bookingErr.message : String(bookingErr)}`);
        }
      }
    }
  } catch (err) {
    errors.push(`Return loop error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 3. Overdue Return Alerts (end_date < today and status active/confirmed) ────
  let overdueAlerted = 0;
  let overdueSkipped = 0;

  try {
    const { data: overdueBookings, error: overdueError } = await supabase
      .from("bookings")
      .select(`
        id, operator_id, renter_name, end_date, deposit_amount, deposit_status,
        vehicles(make, model, year),
        operators(business_name, business_email, late_fee_per_day, late_fee_enabled)
      `)
      .lt("end_date", todayStr)
      .in("status", ["active", "confirmed"]);

    if (overdueError) {
      errors.push(`Overdue query error: ${overdueError.message}`);
    } else {
      for (const booking of overdueBookings || []) {
        try {
          const bookingLink = `/dashboard/bookings/${booking.id}`;

          // Idempotency: one overdue alert per calendar day per booking
          const todayLinkKey = `${bookingLink}:overdue:${todayStr}`;
          const { data: existingAlert } = await supabase
            .from("notifications")
            .select("id")
            .eq("operator_id", booking.operator_id)
            .eq("type", "reminder_return")
            .eq("link", todayLinkKey)
            .maybeSingle();

          if (existingAlert) {
            overdueSkipped++;
            continue;
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const vehicleArr = booking.vehicles as any;
          const vehicle = Array.isArray(vehicleArr) ? vehicleArr[0] : vehicleArr;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const opArr = booking.operators as any;
          const op = Array.isArray(opArr) ? opArr[0] : opArr;
          const vehicleLabel = vehicle
            ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
            : "rental vehicle";
          const operatorName = op?.business_name || "PCR Booking";

          // Compute days overdue + late fee
          const daysOverdue = Math.floor(
            (new Date(todayStr).getTime() - new Date(booking.end_date).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          const lateFeePerDay = Number(op?.late_fee_per_day ?? 0);
          const lateFeeEnabled = op?.late_fee_enabled ?? false;
          const accruedLateFee = lateFeeEnabled && lateFeePerDay > 0
            ? daysOverdue * lateFeePerDay
            : 0;

          // Email operator
          if (op?.business_email) {
            await sendEmail(baseUrl, {
              to: op.business_email,
              subject: `⚠️ Overdue Return: ${booking.renter_name} — ${vehicleLabel} (${daysOverdue} day${daysOverdue !== 1 ? "s" : ""})`,
              body: `<p>Vehicle overdue alert for <strong>${operatorName}</strong>:</p>
<p><strong>Renter:</strong> ${booking.renter_name}</p>
<p><strong>Vehicle:</strong> ${vehicleLabel}</p>
<p><strong>Due Date:</strong> ${formatDate(booking.end_date)}</p>
<p><strong>Days Overdue:</strong> ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""}</p>
${
  accruedLateFee > 0
    ? `<p><strong>Potential Late Fee:</strong> $${accruedLateFee.toFixed(2)} ($${lateFeePerDay.toFixed(2)}/day × ${daysOverdue} days)</p>`
    : ""
}
${
  booking.deposit_status === "held"
    ? `<p><strong>Deposit Hold:</strong> Active — $${Number(booking.deposit_amount).toFixed(2)} can be captured from the booking detail.</p>`
    : ""
}
<p><a href="${baseUrl}/dashboard/bookings/${booking.id}">View Booking →</a></p>`,
              templateType: "operator_overdue_alert",
            });
          }

          // Record idempotency notification
          try {
            await supabase.from("notifications").insert({
              operator_id: booking.operator_id,
              type: "reminder_return",
              title: `Overdue Return Alert — ${booking.renter_name}`,
              message: `${vehicleLabel} is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue.${accruedLateFee > 0 ? ` Potential late fee: $${accruedLateFee.toFixed(2)}.` : ""}`,
              link: todayLinkKey,
              is_read: false,
            });
          } catch { /* non-fatal */ }

          overdueAlerted++;
        } catch (bookingErr) {
          errors.push(`Overdue booking ${booking.id}: ${bookingErr instanceof Error ? bookingErr.message : String(bookingErr)}`);
        }
      }
    }
  } catch (err) {
    errors.push(`Overdue loop error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return NextResponse.json({
    ok: true,
    date: todayStr,
    pickupDate: tomorrowStr,
    returnDate: todayStr,
    pickupRemindersSent: pickupSent,
    pickupRemindersSkipped: pickupSkipped,
    returnRemindersSent: returnSent,
    returnRemindersSkipped: returnSkipped,
    overdueAlertsAlerted: overdueAlerted,
    overdueAlertsSkipped: overdueSkipped,
    errors: errors.length > 0 ? errors : undefined,
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

async function sendEmail(
  baseUrl: string,
  payload: { to: string; subject: string; body: string; templateType: string }
) {
  return fetch(`${baseUrl}/api/email/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((err) => console.error("Email send failed:", err));
}
