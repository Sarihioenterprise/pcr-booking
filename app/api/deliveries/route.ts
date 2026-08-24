import { NextRequest, NextResponse } from "next/server";
import { getOperator } from "@/lib/get-operator";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/deliveries?date=YYYY-MM-DD or ?start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const supabase = createAdminClient();

  let query = supabase
    .from("deliveries")
    .select(`
      *,
      bookings (
        id,
        renter_name,
        vehicle_id,
        vehicles (make, model, year)
      )
    `)
    .eq("operator_id", operator.id)
    .order("scheduled_at", { ascending: true });

  if (date) {
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;
    query = query.gte("scheduled_at", dayStart).lte("scheduled_at", dayEnd);
  } else if (start && end) {
    query = query
      .gte("scheduled_at", `${start}T00:00:00`)
      .lte("scheduled_at", `${end}T23:59:59`);
  }

  const { data, error } = await query;

  if (error) {
    // Table may not exist yet — return empty gracefully
    if (error.code === "PGRST205" || error.message?.includes("deliveries")) {
      return NextResponse.json({ deliveries: [], _migration_needed: true });
    }
    console.error("Deliveries GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deliveries: data || [] });
}

// POST /api/deliveries — create a delivery/pickup task
export async function POST(request: NextRequest) {
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

  try {
    const body = await request.json();
    const {
      booking_id,
      type,
      scheduled_at,
      address,
      renter_name,
      vehicle_label,
      driver_name,
      driver_phone,
      notes,
    } = body;

    if (!scheduled_at || !address || !type) {
      return NextResponse.json(
        { error: "Missing required fields: type, scheduled_at, address" },
        { status: 400 }
      );
    }

    if (!["delivery", "pickup"].includes(type)) {
      return NextResponse.json({ error: "type must be 'delivery' or 'pickup'" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: delivery, error } = await supabase
      .from("deliveries")
      .insert({
        operator_id: operator.id,
        booking_id: booking_id || null,
        type,
        scheduled_at,
        address,
        renter_name: renter_name || null,
        vehicle_label: vehicle_label || null,
        driver_name: driver_name || null,
        driver_phone: driver_phone || null,
        notes: notes || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("deliveries")) {
        return NextResponse.json({
          error: "Deliveries table not yet created. Run: POST /api/admin/migrate-deliveries",
          _migration_needed: true,
        }, { status: 503 });
      }
      console.error("Delivery insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, delivery });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
