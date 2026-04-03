import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import twilio from "twilio";

export async function POST(request: NextRequest) {
  try {
    // Require auth
    await getOperator();

    const body = await request.json();
    const { to, message, booking_id } = body as {
      to: string;
      message: string;
      booking_id?: string;
    };

    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing required fields: to, message" },
        { status: 400 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        { error: "Twilio credentials not configured" },
        { status: 500 }
      );
    }

    const client = twilio(accountSid, authToken);

    await client.messages.create({
      body: message,
      from: fromNumber,
      to,
    });

    // Try to log to sms_logs table (best-effort)
    try {
      const supabase = await createClient();
      await supabase.from("sms_logs").insert({
        to_number: to,
        message,
        booking_id: booking_id || null,
        status: "sent",
        created_at: new Date().toISOString(),
      });
    } catch {
      // Table may not exist — that's OK
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send SMS";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
