import { NextResponse } from "next/server";
import twilio from "twilio";
import { getOperator } from "@/lib/get-operator";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ vehicleId: string }> };

export async function POST(_req: Request, { params }: Params) {
  let operator;
  try {
    operator = await getOperator();
  } catch (err: unknown) {
    const msg = (err as { digest?: string }).digest ?? "";
    if (msg.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  const { vehicleId } = await params;
  const supabase = createAdminClient();

  // Get the vehicle details
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("make, model, year")
    .eq("id", vehicleId)
    .eq("operator_id", operator.id)
    .single();

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  // Get the next person in line
  const { data: next } = await supabase
    .from("vehicle_waitlist")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .eq("operator_id", operator.id)
    .eq("status", "waiting")
    .order("position", { ascending: true })
    .limit(1)
    .single();

  if (!next) {
    return NextResponse.json({ error: "No one on the waitlist" }, { status: 404 });
  }

  const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const operatorContact = operator.phone || operator.notification_phone || "";
  const message = `Hi ${next.renter_name}, the ${vehicleName} you were waiting for is now available. Contact ${operator.business_name} to book it${operatorContact ? `: ${operatorContact}` : "."}`;

  let notifyMethod: "sms" | "email" | "none" = "none";

  if (next.renter_phone) {
    // Send SMS via Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && fromNumber) {
      try {
        const client = twilio(accountSid, authToken);
        await client.messages.create({
          body: message,
          from: fromNumber,
          to: next.renter_phone,
        });
      } catch (err) {
        console.error("[Waitlist] Twilio error:", err);
        return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 });
      }
    } else {
      console.log("[Waitlist] Twilio not configured. Would send to:", next.renter_phone);
      console.log("[Waitlist] Message:", message);
    }
    notifyMethod = "sms";
  } else if (next.renter_email) {
    // Log email intent — extend with GHL or another provider as needed
    console.log("[Waitlist] Email notification to:", next.renter_email, message);
    notifyMethod = "email";
  } else {
    return NextResponse.json(
      { error: "No phone or email on file for this waitlist entry" },
      { status: 400 }
    );
  }

  // Mark as notified
  await supabase
    .from("vehicle_waitlist")
    .update({ status: "notified", notified_at: new Date().toISOString() })
    .eq("id", next.id);

  return NextResponse.json({
    success: true,
    notified: next.renter_name,
    method: notifyMethod,
  });
}
