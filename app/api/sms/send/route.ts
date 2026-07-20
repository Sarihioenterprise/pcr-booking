import { NextResponse } from "next/server";
import twilio from "twilio";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import { fireWebhook } from "@/lib/webhooks";

export async function POST(request: Request) {
  try {
    const { to, message, renterId, bookingId, messageType = "custom" } = await request.json();

    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing 'to' or 'message' field" },
        { status: 400 }
      );
    }

    // Get operator for logging
    const operator = await getOperator();
    const supabase = await createClient();

    // Check for Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    let twilioSid: string | null = null;
    let status = "sent";

    if (!accountSid || !authToken || !fromNumber) {
      // Twilio not configured - log and return success for dev
      console.log("[SMS] Twilio not configured. Would send to:", to);
      console.log("[SMS] Message:", message);
    } else {
      // Send SMS via Twilio
      const client = twilio(accountSid, authToken);

      try {
        const result = await client.messages.create({
          body: message,
          from: fromNumber,
          to: to,
        });
        twilioSid = result.sid;
      } catch (twilioError) {
        console.error("[SMS] Twilio error:", twilioError);
        status = "failed";
      }
    }

    // Log to renter_comms_log
    await supabase.from("renter_comms_log").insert({
      operator_id: operator.id,
      renter_id: renterId || null,
      booking_id: bookingId || null,
      message_type: messageType,
      message_body: message,
      to_phone: to,
      status,
      twilio_sid: twilioSid,
    });

    // Fire webhook based on message type
    if (status === "sent") {
      let webhookEvent = "payment.received"; // default
      if (messageType === "contract") {
        webhookEvent = "contract.sent";
      } else if (messageType === "booking_confirmation") {
        webhookEvent = "booking.confirmed";
      } else if (messageType === "payment_reminder") {
        webhookEvent = "payment.received";
      } else if (messageType === "late_fee") {
        webhookEvent = "payment.overdue";
      }

      fireWebhook(operator.id, webhookEvent as any, {
        renter_id: renterId,
        booking_id: bookingId,
        message_type: messageType,
        phone: to,
      });
    }

    return NextResponse.json({
      success: true,
      sid: twilioSid,
      to,
    });
  } catch (error: any) {
    console.error("[SMS] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send SMS" },
      { status: 500 }
    );
  }
}
