import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const supabase = createAdminClient();

    // Get the booking to find operator_id
    const { data: booking } = await supabase
      .from("bookings")
      .select("operator_id, renter_name, renter_email")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const { data: tickets, error } = await supabase
      .from("support_tickets")
      .select("*, ticket_messages(*)")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(tickets);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const supabase = createAdminClient();
    const body = await request.json();

    const { subject, message } = body;

    // Get the booking to find operator_id and renter info
    const { data: booking } = await supabase
      .from("bookings")
      .select("operator_id, renter_name, renter_email")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        operator_id: booking.operator_id,
        booking_id: bookingId,
        renter_name: booking.renter_name,
        renter_email: booking.renter_email,
        subject,
        status: "open",
        priority: "normal",
      })
      .select()
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: ticketError?.message || "Failed to create ticket" },
        { status: 400 }
      );
    }

    // Add the first message
    const { error: msgError } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: ticket.id,
        sender_type: "renter",
        sender_name: booking.renter_name,
        content: message,
      });

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 400 });
    }

    return NextResponse.json(ticket);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
