import { NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(request: Request) {
  try {
    const { to, message } = await request.json();

    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing 'to' or 'message' field" },
        { status: 400 }
      );
    }

    // Check for Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      // Twilio not configured - log and return success for dev
      console.log("[SMS] Twilio not configured. Would send to:", to);
      console.log("[SMS] Message:", message);
      return NextResponse.json({
        success: true,
        message: "SMS logged (Twilio not configured)",
        to,
      });
    }

    // Send SMS via Twilio
    const client = twilio(accountSid, authToken);

    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to,
    });

    return NextResponse.json({
      success: true,
      sid: result.sid,
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
