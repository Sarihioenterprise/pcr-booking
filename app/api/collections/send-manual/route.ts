import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import twilio from "twilio";

export async function POST(request: NextRequest) {
  const operator = await getOperator();
  if (!operator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { paymentScheduleId, message } = body as { paymentScheduleId: string; message?: string };

  if (!paymentScheduleId) {
    return NextResponse.json({ error: "paymentScheduleId is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: payment, error: paymentError } = await supabase
    .from("payment_schedule")
    .select("id, booking_id, operator_id, amount, late_fee_amount, pay_link, dunning_stage, bookings(renter_name, renter_phone)")
    .eq("id", paymentScheduleId)
    .eq("operator_id", operator.id)
    .single();

  if (paymentError || !payment) {
    return NextResponse.json({ error: "Payment schedule not found" }, { status: 404 });
  }

  const booking = (payment as unknown as { bookings: { renter_name: string; renter_phone: string | null } | null }).bookings;
  const renterPhone = booking?.renter_phone;

  if (!renterPhone) {
    return NextResponse.json({ error: "No phone number for this renter" }, { status: 400 });
  }

  const renterName = booking?.renter_name ?? "Renter";
  const payLink = payment.pay_link ?? `https://app.pcrbooking.com/pay/${payment.id}`;
  const totalAmount = Number(payment.amount) + Number(payment.late_fee_amount ?? 0);
  const smsMessage = message ?? `Hi ${renterName}, this is a reminder that your rental payment of $${totalAmount.toFixed(2)} is overdue. Pay now: ${payLink}`;

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json({ error: "SMS not configured" }, { status: 500 });
    }

    const client = twilio(accountSid, authToken);
    await client.messages.create({ body: smsMessage, from: fromNumber, to: renterPhone });

    await supabase.from("dunning_log").insert({
      payment_schedule_id: payment.id,
      operator_id: operator.id,
      booking_id: payment.booking_id,
      stage: payment.dunning_stage ?? "manual",
      channel: "sms",
      message_sent: smsMessage,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "SMS failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
