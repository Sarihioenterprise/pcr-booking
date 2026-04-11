import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: renterId } = await params;
  const operator = await getOperator();

  if (!operator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { document_name, document_type, file_url, expiry_date, booking_id } = body;

    if (!document_name || !booking_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify booking belongs to this operator
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, operator_id")
      .eq("id", booking_id)
      .eq("operator_id", operator.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found or unauthorized" },
        { status: 404 }
      );
    }

    // Insert document
    const { data: document, error: insertError } = await supabase
      .from("renter_documents")
      .insert({
        operator_id: operator.id,
        booking_id,
        document_name,
        document_type,
        file_url,
        expiry_date,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(document);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
