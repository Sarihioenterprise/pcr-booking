import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id: vehicleId, recordId } = await params;
    const operator = await getOperator();
    const supabase = createAdminClient();

    // Verify record ownership
    const { data: record, error: findError } = await supabase
      .from("maintenance_records")
      .select("id")
      .eq("id", recordId)
      .eq("vehicle_id", vehicleId)
      .eq("operator_id", operator.id)
      .single();

    if (findError || !record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      service_type,
      date,
      odometer,
      cost,
      vendor,
      notes,
      next_service_date,
      next_service_odometer,
      status,
      description,
    } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (service_type !== undefined) updates.type = service_type;
    if (description !== undefined) updates.description = description || null;
    if (status !== undefined) updates.status = status;
    if (date !== undefined) updates.date_performed = date || null;
    if (odometer !== undefined) updates.mileage_at_service = odometer ? Number(odometer) : null;
    if (cost !== undefined) updates.cost = cost ? Number(cost) : null;
    if (vendor !== undefined) updates.vendor = vendor || null;
    if (notes !== undefined) updates.notes = notes || null;
    if (next_service_date !== undefined) updates.date_due = next_service_date || null;
    if (next_service_odometer !== undefined)
      updates.mileage_due = next_service_odometer ? Number(next_service_odometer) : null;

    const { data, error } = await supabase
      .from("maintenance_records")
      .update(updates)
      .eq("id", recordId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id: vehicleId, recordId } = await params;
    const operator = await getOperator();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("maintenance_records")
      .delete()
      .eq("id", recordId)
      .eq("vehicle_id", vehicleId)
      .eq("operator_id", operator.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
