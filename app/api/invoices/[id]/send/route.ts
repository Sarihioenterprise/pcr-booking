import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operator = await getOperator();
    const supabase = await createClient();
    const { id } = await params;

    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .eq("operator_id", operator.id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (invoice.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot send a cancelled invoice" },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("invoices")
      .update({
        status: invoice.status === "draft" ? "sent" : invoice.status,
        sent_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Failed to update invoice:", updateError);
      return NextResponse.json(
        { error: "Failed to send invoice" },
        { status: 500 }
      );
    }

    return NextResponse.json({ invoice: updated });
  } catch (err) {
    console.error("Invoice send error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
