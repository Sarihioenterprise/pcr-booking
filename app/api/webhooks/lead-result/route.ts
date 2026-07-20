import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import twilio from "twilio";

export async function POST(request: NextRequest) {
  // ── Webhook Secret Verification ──────────────────────────────────────────
  const webhookSecret = process.env.WEBHOOK_SECRET;
  const authHeader = request.headers.get("authorization");

  if (webhookSecret) {
    // Secret is configured — enforce it
    if (authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
  } else {
    // Secret not configured — warn and allow through for backward compatibility
    console.warn(
      "[webhooks/lead-result] WEBHOOK_SECRET is not set. " +
        "Set WEBHOOK_SECRET in your environment to secure this endpoint."
    );
  }

  try {
    const body = await request.json();
    const {
      lead_id,
      operator_id,
      uber_lyft_approved,
      valid_license,
      age_25_plus,
      stage,
      disqualify_reason,
      transcript,
    } = body;

    if (!lead_id || !operator_id) {
      return NextResponse.json(
        { success: false, error: "Missing lead_id or operator_id" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("leads")
      .update({
        uber_lyft_approved,
        valid_license,
        age_25_plus,
        stage,
        disqualify_reason,
        call_transcript: transcript,
      })
      .eq("id", lead_id)
      .eq("operator_id", operator_id);

    if (error) {
      console.error("Failed to update lead:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update lead" },
        { status: 500 }
      );
    }

    if (stage === "hot_lead") {
      // Send SMS notification to operator's notification_phone
      try {
        const { data: operator } = await supabase
          .from("operators")
          .select("notification_phone, business_name, owner_name")
          .eq("id", operator_id)
          .single();

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_PHONE_NUMBER;

        if (operator?.notification_phone && accountSid && authToken && fromNumber) {
          const client = twilio(accountSid, authToken);
          // Try to get renter name from the lead record
          const { data: lead } = await supabase
            .from("leads")
            .select("name, phone")
            .eq("id", lead_id)
            .single();
          const leadInfo = lead?.name ? ` from ${lead.name}` : "";
          await client.messages.create({
            body: `\ud83d\udd25 Hot Lead Alert! A qualified renter${leadInfo} is ready to book. Log in to PCR Booking to follow up: https://pcrbooking.com/dashboard/leads`,
            from: fromNumber,
            to: operator.notification_phone,
          });
          console.log(
            `[NOTIFICATION] Hot lead SMS sent to operator ${operator_id}`
          );
        } else {
          console.warn(
            `[NOTIFICATION] Hot lead detected but cannot send SMS — ` +
              `operator_id: ${operator_id}, has_phone: ${!!operator?.notification_phone}, ` +
              `twilio_configured: ${!!(accountSid && authToken && fromNumber)}`
          );
        }
      } catch (smsErr) {
        // Non-fatal: log but don't fail the webhook response
        console.error("[NOTIFICATION] Failed to send hot lead SMS:", smsErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Lead result webhook error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
