import { NextRequest, NextResponse } from "next/server";
import { getOperator } from "@/lib/get-operator";
import { createAdminClient } from "@/lib/supabase/admin";

// PATCH /api/addons/[id] — update an add-on (dashboard, authenticated)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operator = await getOperator();
    const { id } = await params;
    const supabase = createAdminClient();
    const body = await request.json();

    const {
      name,
      description,
      pricing_type,
      price,
      category,
      required,
      active,
      sort_order,
    } = body;

    // Build update object with only provided fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (pricing_type !== undefined) updates.pricing_type = pricing_type;
    if (price !== undefined) updates.price = Number(price);
    if (category !== undefined) updates.category = category;
    if (required !== undefined) updates.required = Boolean(required);
    if (active !== undefined) updates.active = Boolean(active);
    if (sort_order !== undefined) updates.sort_order = sort_order;

    const { data, error } = await supabase
      .from("addons")
      .update(updates)
      .eq("id", id)
      .eq("operator_id", operator.id) // scoped to operator
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ addon: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/addons/[id] — soft delete (deactivate) an add-on
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operator = await getOperator();
    const { id } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("addons")
      .delete()
      .eq("id", id)
      .eq("operator_id", operator.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
