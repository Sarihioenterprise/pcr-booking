import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookingId: string; ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string; ticketId: string }> }
) {
  try {
    const { bookingId, ticketId } = await params;
    const supabase = createAdminClient();
    const body = await request.json();

    const { content, sender_name } = body;

    // Get booking info for sender name fallback
    const { data: booking } = await supabase
      .from("bookings")
      .select("renter_name")
      .eq("id", bookingId)
      .single();

    const { data, error } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_type: "renter",
        sender_name: sender_name || booking?.renter_name || "Renter",
        content,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Update ticket updated_at
    await supabase
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
