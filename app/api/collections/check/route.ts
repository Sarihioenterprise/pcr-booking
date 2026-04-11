import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/create-notification";
import twilio from "twilio";

const DEFAULT_LATE_FEE = 25;

function twilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
  return twilio(accountSid, authToken);
}

async function sendSMS(to: string, message: string): Promise<boolean> {
  try {
    const client = twilioClient();
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    if (!client || !fromNumber) return false;
    await client.messages.create({ body: message, from: fromNumber, to });
    return true;
  } catch {
    return false;
  }
}

function daysOverdue(dueDateStr: string): number {
  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

type PaymentScheduleRow = {
  id: string;
  booking_id: string;
  operator_id: string;
  amount: number;
  late_fee_amount: number;
  due_date: string;
  status: string;
  dunning_stage: string;
  pay_link: string | null;
  bookings: {
    renter_name: string;
    renter_phone: string | null;
    vehicles: {
      year: number | null;
      make: string | null;
      model: string | null;
    } | null;
  } | null;
};

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const { data: overduePayments, error } = await supabase
    .from("payment_schedule")
    .select(`
      id, booking_id, operator_id, amount, late_fee_amount, due_date, status, dunning_stage, pay_link,
      bookings(renter_name, renter_phone, vehicles(year, make, model))
    `)
    .in("status", ["pending", "overdue"])
    .lte("due_date", todayStr);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const row of (overduePayments ?? []) as unknown as PaymentScheduleRow[]) {
    try {
      const booking = row.bookings;
      if (!booking) continue;

      const renterName = booking.renter_name ?? "Renter";
      const renterPhone = booking.renter_phone;
      const days = daysOverdue(row.due_date);
      const payLink = row.pay_link ?? `https://app.pcrbooking.com/pay/${row.id}`;
      const totalAmount = Number(row.amount) + Number(row.late_fee_amount ?? 0);
      const stage = row.dunning_stage ?? "none";

      // Day 0 — due today or just became overdue
      if (days >= 0 && stage === "none") {
        await supabase
          .from("payment_schedule")
          .update({ status: "overdue", dunning_stage: "reminder_1", last_reminder_sent_at: new Date().toISOString(), reminder_count: 1 })
          .eq("id", row.id);

        const msg = `Hi ${renterName}, your payment of $${Number(row.amount).toFixed(2)} for your rental was due today. Pay now to avoid a late fee: ${payLink}`;
        if (renterPhone) {
          const sent = await sendSMS(renterPhone, msg);
          if (sent) {
            await supabase.from("dunning_log").insert({
              payment_schedule_id: row.id,
              operator_id: row.operator_id,
              booking_id: row.booking_id,
              stage: "reminder_1",
              channel: "sms",
              message_sent: msg,
            });
          }
        }
        processed++;
      }

      // Day 3 — add late fee
      else if (days >= 3 && stage === "reminder_1") {
        const lateFee = DEFAULT_LATE_FEE;
        await supabase
          .from("payment_schedule")
          .update({
            dunning_stage: "reminder_2",
            late_fee_amount: lateFee,
            late_fee_applied_at: new Date().toISOString(),
            last_reminder_sent_at: new Date().toISOString(),
          })
          .eq("id", row.id);

        const msg = `Hi ${renterName}, your rental payment of $${Number(row.amount).toFixed(2)} is 3 days late. A $${lateFee} late fee has been added. Pay now: ${payLink}`;
        if (renterPhone) {
          const sent = await sendSMS(renterPhone, msg);
          if (sent) {
            await supabase.from("dunning_log").insert({
              payment_schedule_id: row.id,
              operator_id: row.operator_id,
              booking_id: row.booking_id,
              stage: "reminder_2",
              channel: "sms",
              message_sent: msg,
            });
          }
        }
        processed++;
      }

      // Day 5 — final warning
      else if (days >= 5 && stage === "reminder_2") {
        await supabase
          .from("payment_schedule")
          .update({ dunning_stage: "reminder_3", last_reminder_sent_at: new Date().toISOString() })
          .eq("id", row.id);

        const msg = `FINAL NOTICE: ${renterName}, your rental account is past due $${totalAmount.toFixed(2)}. Pay immediately to avoid losing access to your vehicle: ${payLink}`;
        if (renterPhone) {
          const sent = await sendSMS(renterPhone, msg);
          if (sent) {
            await supabase.from("dunning_log").insert({
              payment_schedule_id: row.id,
              operator_id: row.operator_id,
              booking_id: row.booking_id,
              stage: "reminder_3",
              channel: "sms",
              message_sent: msg,
            });
          }
        }
        processed++;
      }

      // Day 7 — notify operator
      else if (days >= 7 && stage === "reminder_3") {
        await supabase
          .from("payment_schedule")
          .update({ dunning_stage: "final", last_reminder_sent_at: new Date().toISOString() })
          .eq("id", row.id);

        await createNotification(
          row.operator_id,
          "payment_received",
          "Payment 7 Days Overdue",
          `${renterName} has not paid in 7 days — consider vehicle recovery`,
          `/dashboard/collections`
        );
        processed++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`payment_schedule ${row.id}: ${msg}`);
    }
  }

  return NextResponse.json({ processed, errors });
}
