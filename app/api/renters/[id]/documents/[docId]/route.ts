import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id: renterId, docId } = await params;
  const operator = await getOperator();

  if (!operator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();

    // Verify document belongs to this operator
    const { data: document, error: docError } = await supabase
      .from("renter_documents")
      .select("id, operator_id")
      .eq("id", docId)
      .eq("operator_id", operator.id)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete document
    const { error: deleteError } = await supabase
      .from("renter_documents")
      .delete()
      .eq("id", docId)
      .eq("operator_id", operator.id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
