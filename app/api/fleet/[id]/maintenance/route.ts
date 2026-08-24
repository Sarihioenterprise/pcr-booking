import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;
    const operator = await getOperator();
    const supabase = createAdminClient();

    // Verify the vehicle belongs to this operator
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("id", vehicleId)
      .eq("operator_id", operator.id)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const { data: records, error } = await supabase
      .from("maintenance_records")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .eq("operator_id", operator.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Augment with overdue flag
    const now = new Date();
    const augmented = (records ?? []).map((r) => ({
      ...r,
      is_overdue:
        r.date_due &&
        r.status !== "completed" &&
        new Date(r.date_due) < now,
    }));

    return NextResponse.json(augmented);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;
    const operator = await getOperator();
    const supabase = createAdminClient();

    // Verify the vehicle belongs to this operator
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id")
      .eq("id", vehicleId)
      .eq("operator_id", operator.id)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
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
      description,
    } = body;

    if (!service_type) {
      return NextResponse.json(
        { error: "service_type is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("maintenance_records")
      .insert({
        operator_id: operator.id,
        vehicle_id: vehicleId,
        type: service_type,
        description: description || null,
        status: next_service_date ? "scheduled" : "completed",
        date_performed: date || null,
        mileage_at_service: odometer ? Number(odometer) : null,
        cost: cost ? Number(cost) : null,
        vendor: vendor || null,
        notes: notes || null,
        date_due: next_service_date || null,
        mileage_due: next_service_odometer ? Number(next_service_odometer) : null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
