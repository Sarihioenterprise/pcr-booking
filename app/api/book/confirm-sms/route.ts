import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import twilio from "twilio";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, leadId } = body;

    if (!bookingId && !leadId) {
      return NextResponse.json(
        { error: "Missing bookingId or leadId" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    let renterName = "";
    let renterPhone = "";
    let operator_id = "";
    let vehicleInfo = "";

    // Try to fetch as booking first, then as lead
    if (bookingId) {
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, renter_name, renter_phone, start_date, end_date, operator_id, vehicle_id")
        .eq("id", bookingId)
        .single();

      if (!bookingError && booking) {
        renterName = booking.renter_name;
        renterPhone = booking.renter_phone;
        operator_id = booking.operator_id;

        // Fetch vehicle info if available
        if (booking.vehicle_id) {
          const { data: vehicle } = await supabase
            .from("vehicles")
            .select("year, make, model")
            .eq("id", booking.vehicle_id)
            .single();

          if (vehicle) {
            vehicleInfo = ` ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
          }
        }
      }
    }

    // If no booking found, try lead
    if (!renterName && leadId) {
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("id, name, phone, operator_id")
        .eq("id", leadId)
        .single();

      if (!leadError && lead) {
        renterName = lead.name;
        renterPhone = lead.phone;
        operator_id = lead.operator_id;
      }
    }

    if (!renterName || !renterPhone) {
      return NextResponse.json(
        { error: "Renter details not found" },
        { status: 404 }
      );
    }

    // Fetch operator business_name
    const { data: operator, error: operatorError } = await supabase
      .from("operators")
      .select("business_name")
      .eq("id", operator_id)
      .single();

    if (operatorError || !operator) {
      return NextResponse.json(
        { error: "Operator not found" },
        { status: 404 }
      );
    }

    // Compose SMS message
    const smsMessage = `Hi ${renterName}! Your booking request with ${operator.business_name}${vehicleInfo ? " for a " + vehicleInfo : ""} has been received. We will contact you shortly to confirm. Questions? Reply to this message.`;

    // Send SMS via Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        { error: "SMS not configured" },
        { status: 500 }
      );
    }

    const client = twilio(accountSid, authToken);
    await client.messages.create({
      body: smsMessage,
      from: fromNumber,
      to: renterPhone,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
