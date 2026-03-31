import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

export async function POST(request: NextRequest) {
  try {
    const operator = await getOperator();
    const supabase = await createClient();
    const body = await request.json();

    const { booking_id, template_id } = body;

    // Fetch the template
    const { data: template, error: tplError } = await supabase
      .from("agreement_templates")
      .select("*")
      .eq("id", template_id)
      .eq("operator_id", operator.id)
      .single();

    if (tplError || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Fetch the booking with vehicle and renter info
    const { data: booking, error: bkError } = await supabase
      .from("bookings")
      .select("*, vehicles(make, model, year), renters(name)")
      .eq("id", booking_id)
      .eq("operator_id", operator.id)
      .single();

    if (bkError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Replace template variables
    const vehicleName = booking.vehicles
      ? `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`
      : "N/A";

    const renterName = booking.renters?.name || booking.renter_name || "N/A";

    let content = template.content;
    content = content.replace(/\{\{renter_name\}\}/g, renterName);
    content = content.replace(/\{\{vehicle\}\}/g, vehicleName);
    content = content.replace(/\{\{start_date\}\}/g, booking.start_date);
    content = content.replace(/\{\{end_date\}\}/g, booking.end_date);
    content = content.replace(
      /\{\{total_price\}\}/g,
      `$${Number(booking.total_price).toLocaleString()}`
    );
    content = content.replace(
      /\{\{deposit_amount\}\}/g,
      `$${Number(booking.deposit_amount).toLocaleString()}`
    );

    // Create the agreement
    const { data: agreement, error: createError } = await supabase
      .from("rental_agreements")
      .insert({
        operator_id: operator.id,
        booking_id,
        template_id,
        content,
        status: "draft",
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(agreement);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
