import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import twilio from "twilio";

async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) return false;

    const client = twilio(accountSid, authToken);
    await client.messages.create({ body: message, from: fromNumber, to });
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);
    const in3DaysStr = in3Days.toISOString().split("T")[0];

    let remindersSent = 0;

    // ── 1. Reminders due in 3 days ──────────────────────────────────
    const { data: upcoming3 } = await supabase
      .from("payment_schedule_items")
      .select(`
        id, amount, due_date, booking_id,
        bookings(renter_name, renter_phone, operator_id,
          operators(notification_preferences))
      `)
      .eq("due_date", in3DaysStr)
      .eq("status", "pending");

    for (const item of upcoming3 ?? []) {
      const booking = (item as unknown as { bookings: { renter_name: string; renter_phone: string | null; operators: { notification_preferences: Record<string, boolean> | null } | null } | null }).bookings;
      if (!booking?.renter_phone) continue;

      const prefs = booking?.operators?.notification_preferences ?? {};
      if (!prefs.payment_reminder_3_days) continue;

      const msg = `Hi ${booking.renter_name}, a payment of $${Number(item.amount).toFixed(2)} is due in 3 days (${item.due_date}). Please reach out if you have questions.`;
      const sent = await sendSMS(booking.renter_phone, msg);
      if (sent) remindersSent++;
    }

    // ── 2. Reminders due today ──────────────────────────────────────
    const { data: dueToday } = await supabase
      .from("payment_schedule_items")
      .select(`
        id, amount, due_date, booking_id,
        bookings(renter_name, renter_phone, operator_id,
          operators(notification_preferences))
      `)
      .eq("due_date", todayStr)
      .eq("status", "pending");

    for (const item of dueToday ?? []) {
      const booking = (item as unknown as { bookings: { renter_name: string; renter_phone: string | null; operators: { notification_preferences: Record<string, boolean> | null } | null } | null }).bookings;
      if (!booking?.renter_phone) continue;

      const prefs = booking?.operators?.notification_preferences ?? {};
      if (!prefs.payment_reminder_day_of) continue;

      const msg = `Hi ${booking.renter_name}, your payment of $${Number(item.amount).toFixed(2)} is due TODAY. Please contact us to arrange payment.`;
      const sent = await sendSMS(booking.renter_phone, msg);
      if (sent) remindersSent++;
    }

    // ── 3. Overdue payments ─────────────────────────────────────────
    const { data: overdue } = await supabase
      .from("payment_schedule_items")
      .select(`
        id, amount, due_date, booking_id,
        bookings(renter_name, renter_phone, operator_id,
          operators(notification_preferences))
      `)
      .lt("due_date", todayStr)
      .not("status", "eq", "paid")
      .not("status", "eq", "waived");

    for (const item of overdue ?? []) {
      const booking = (item as unknown as { bookings: { renter_name: string; renter_phone: string | null; operators: { notification_preferences: Record<string, boolean> | null } | null } | null }).bookings;
      if (!booking?.renter_phone) continue;

      const prefs = booking?.operators?.notification_preferences ?? {};
      if (!prefs.payment_overdue) continue;

      const msg = `Hi ${booking.renter_name}, your payment of $${Number(item.amount).toFixed(2)} was due on ${item.due_date} and is now overdue. Please contact us immediately.`;
      const sent = await sendSMS(booking.renter_phone, msg);
      if (sent) remindersSent++;
    }

    return NextResponse.json({ success: true, remindersSent });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
