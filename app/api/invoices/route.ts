import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

function generateInvoiceNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
  return `INV-${datePart}-${randomPart}`;
}

export async function POST(request: NextRequest) {
  try {
    const operator = await getOperator();
    const supabase = await createClient();
    const body = await request.json();

    const { booking_id, notes } = body;

    if (!booking_id) {
      return NextResponse.json(
        { error: "Missing required field: booking_id" },
        { status: 400 }
      );
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .eq("operator_id", operator.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const invoiceNumber = generateInvoiceNumber();

    const { data: invoice, error: insertError } = await supabase
      .from("invoices")
      .insert({
        operator_id: operator.id,
        booking_id: booking.id,
        renter_id: booking.renter_id,
        invoice_number: invoiceNumber,
        amount: booking.total_price - booking.tax_amount - booking.discount_amount,
        tax_amount: booking.tax_amount,
        discount_amount: booking.discount_amount,
        total: booking.total_price,
        status: "draft",
        due_date: booking.start_date,
        notes: notes || null,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Failed to create invoice:", insertError);
      return NextResponse.json(
        { error: "Failed to create invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    console.error("Invoice creation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
