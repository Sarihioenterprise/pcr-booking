import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import { createNotification } from "@/lib/create-notification";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operator = await getOperator();
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // Fetch the lead
    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("operator_id", operator.id)
      .single();

    if (fetchError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Create renter from lead data
    const { data: renter, error: renterError } = await supabase
      .from("renters")
      .insert({
        operator_id: operator.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
      })
      .select("*")
      .single();

    if (renterError) {
      return NextResponse.json(
        { error: "Failed to create renter: " + renterError.message },
        { status: 500 }
      );
    }

    // Create booking from lead data
    const startDate = body.start_date || new Date().toISOString().split("T")[0];
    const durationDays = lead.duration_days || 7;
    const endDate =
      body.end_date ||
      new Date(
        new Date(startDate).getTime() + durationDays * 86400000
      )
        .toISOString()
        .split("T")[0];

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        operator_id: operator.id,
        renter_id: renter.id,
        renter_name: lead.name,
        renter_phone: lead.phone,
        renter_email: lead.email,
        start_date: startDate,
        end_date: endDate,
        duration_days: durationDays,
        daily_rate: body.daily_rate || 0,
        total_price: body.total_price || 0,
        tax_amount: 0,
        discount_amount: 0,
        deposit_amount: 0,
        status: "inquiry",
        vehicle_id: body.vehicle_id || null,
        notes: `Converted from lead. Original dates requested: ${lead.dates_requested || "N/A"}`,
      })
      .select("*")
      .single();

    if (bookingError) {
      return NextResponse.json(
        { error: "Failed to create booking: " + bookingError.message },
        { status: 500 }
      );
    }

    // Update lead status to converted
    const now = new Date().toISOString();
    await supabase
      .from("leads")
      .update({
        followup_status: "converted",
        stage: "hot_lead",
        last_followup_at: now,
        next_followup_at: null,
        updated_at: now,
      })
      .eq("id", id);

    // Create notification
    await createNotification(
      operator.id,
      "new_booking",
      "Lead Converted",
      `${lead.name} has been converted to a booking.`,
      `/dashboard/bookings/${booking.id}`
    );

    return NextResponse.json({
      success: true,
      renter_id: renter.id,
      booking_id: booking.id,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
