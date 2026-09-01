import { NextResponse } from "next/server";
import { getOperator } from "@/lib/get-operator";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ vehicleId: string }> };

export async function GET(_req: Request, { params }: Params) {
  let operator;
  try {
    operator = await getOperator();
  } catch (err: unknown) {
    const msg = (err as { digest?: string }).digest ?? "";
    if (msg.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  const { vehicleId } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("vehicle_waitlist")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .eq("operator_id", operator.id)
    .order("position", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ waitlist: data ?? [] });
}

export async function POST(req: Request, { params }: Params) {
  let operator;
  try {
    operator = await getOperator();
  } catch (err: unknown) {
    const msg = (err as { digest?: string }).digest ?? "";
    if (msg.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  const { vehicleId } = await params;
  const body = await req.json();
  const { renter_name, renter_email, renter_phone, notes } = body;

  if (!renter_name) {
    return NextResponse.json({ error: "renter_name is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get next position number
  const { data: existing } = await supabase
    .from("vehicle_waitlist")
    .select("position")
    .eq("vehicle_id", vehicleId)
    .eq("operator_id", operator.id)
    .eq("status", "waiting")
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const nextPosition = existing ? existing.position + 1 : 1;

  const { data, error } = await supabase
    .from("vehicle_waitlist")
    .insert({
      vehicle_id: vehicleId,
      operator_id: operator.id,
      renter_name,
      renter_email: renter_email || null,
      renter_phone: renter_phone || null,
      notes: notes || null,
      position: nextPosition,
      status: "waiting",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data }, { status: 201 });
}

export async function DELETE(req: Request, { params }: Params) {
  let operator;
  try {
    operator = await getOperator();
  } catch (err: unknown) {
    const msg = (err as { digest?: string }).digest ?? "";
    if (msg.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  const { vehicleId } = await params;
  const url = new URL(req.url);
  const waitlistId = url.searchParams.get("waitlistId");

  if (!waitlistId) {
    return NextResponse.json({ error: "waitlistId is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get the entry being removed so we know its position
  const { data: entry } = await supabase
    .from("vehicle_waitlist")
    .select("position, status")
    .eq("id", waitlistId)
    .eq("operator_id", operator.id)
    .single();

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  // Mark as removed
  const { error } = await supabase
    .from("vehicle_waitlist")
    .update({ status: "removed" })
    .eq("id", waitlistId)
    .eq("operator_id", operator.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Reorder remaining waiting entries that were after this position
  if (entry.status === "waiting") {
    const { data: toReorder } = await supabase
      .from("vehicle_waitlist")
      .select("id, position")
      .eq("vehicle_id", vehicleId)
      .eq("operator_id", operator.id)
      .eq("status", "waiting")
      .gt("position", entry.position)
      .order("position", { ascending: true });

    if (toReorder && toReorder.length > 0) {
      for (const row of toReorder) {
        await supabase
          .from("vehicle_waitlist")
          .update({ position: row.position - 1 })
          .eq("id", row.id);
      }
    }
  }

  return NextResponse.json({ success: true });
}
