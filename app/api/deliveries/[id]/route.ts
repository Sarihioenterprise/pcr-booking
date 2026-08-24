import { NextRequest, NextResponse } from "next/server";
import { getOperator } from "@/lib/get-operator";
import { createAdminClient } from "@/lib/supabase/admin";

// PATCH /api/deliveries/[id] — update status, driver, notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let operator;
  try {
    operator = await getOperator();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("NEXT_REDIRECT") || (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { status, driver_name, driver_phone, notes, scheduled_at, address, type } = body;

    const supabase = createAdminClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from("deliveries")
      .select("id")
      .eq("id", id)
      .eq("operator_id", operator.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (driver_name !== undefined) updates.driver_name = driver_name;
    if (driver_phone !== undefined) updates.driver_phone = driver_phone;
    if (notes !== undefined) updates.notes = notes;
    if (scheduled_at !== undefined) updates.scheduled_at = scheduled_at;
    if (address !== undefined) updates.address = address;
    if (type !== undefined) updates.type = type;

    const { data: delivery, error } = await supabase
      .from("deliveries")
      .update(updates)
      .eq("id", id)
      .eq("operator_id", operator.id)
      .select()
      .single();

    if (error) {
      console.error("Delivery update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, delivery });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/deliveries/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let operator;
  try {
    operator = await getOperator();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("NEXT_REDIRECT") || (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  const { id } = await params;

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("deliveries")
    .delete()
    .eq("id", id)
    .eq("operator_id", operator.id);

  if (error) {
    console.error("Delivery delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
