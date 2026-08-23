/**
 * GET  /api/quotes  — list all quotes for the authenticated operator
 * POST /api/quotes  — create a new quote
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest) {
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
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("quotes")
      .select(`
        *,
        vehicles(id, make, model, year, photo_url, daily_rate),
        renters(id, name, email, phone)
      `)
      .eq("operator_id", operator.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error("GET /api/quotes error:", err);
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────

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
      vehicleId,
      pickupDate,
      returnDate,
      addonIds = [],
      customerEmail,
      customerPhone,
      customerName,
      notes,
      renterId,
    } = body;

    if (!pickupDate || !returnDate) {
      return NextResponse.json(
        { error: "pickupDate and returnDate are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Calculate duration
    const pickup = new Date(pickupDate);
    const returnD = new Date(returnDate);
    const durationDays = Math.max(1, Math.ceil((returnD.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24)));

    // Fetch vehicle for pricing
    let baseTotal = 0;
    if (vehicleId) {
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("daily_rate, weekly_rate, monthly_rate")
        .eq("id", vehicleId)
        .eq("operator_id", operator.id)
        .single();

      if (vehicle) {
        // Best rate logic: monthly > weekly > daily
        if (durationDays >= 30 && vehicle.monthly_rate) {
          const months = Math.floor(durationDays / 30);
          const remainingDays = durationDays % 30;
          baseTotal = months * vehicle.monthly_rate + remainingDays * vehicle.daily_rate;
        } else if (durationDays >= 7 && vehicle.weekly_rate) {
          const weeks = Math.floor(durationDays / 7);
          const remainingDays = durationDays % 7;
          baseTotal = weeks * vehicle.weekly_rate + remainingDays * vehicle.daily_rate;
        } else {
          baseTotal = durationDays * vehicle.daily_rate;
        }
      }
    }

    // Fetch add-ons and compute total
    let addonTotal = 0;
    let addonsSnapshot: unknown[] = [];
    if (addonIds.length > 0) {
      const { data: addons } = await supabase
        .from("addons")
        .select("*")
        .in("id", addonIds)
        .eq("operator_id", operator.id);

      if (addons) {
        addonsSnapshot = addons.map((a) => {
          const days = a.pricing_type === "per_day" ? durationDays : 1;
          const amount = a.price * days;
          addonTotal += amount;
          return { ...a, days, amount };
        });
      }
    }

    const total = baseTotal + addonTotal;

    // Insert quote
    const { data: quote, error } = await supabase
      .from("quotes")
      .insert({
        operator_id: operator.id,
        renter_id: renterId ?? null,
        vehicle_id: vehicleId ?? null,
        customer_name: customerName ?? null,
        customer_email: customerEmail ?? null,
        customer_phone: customerPhone ?? null,
        pickup_date: pickupDate,
        return_date: returnDate,
        duration_days: durationDays,
        base_total: baseTotal,
        addon_total: addonTotal,
        total,
        addon_ids: addonIds,
        addons_snapshot: addonsSnapshot,
        notes: notes ?? null,
        status: "pending",
      })
      .select(`
        *,
        vehicles(id, make, model, year, photo_url, daily_rate),
        renters(id, name, email, phone)
      `)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json(quote, { status: 201 });
  } catch (err) {
    console.error("POST /api/quotes error:", err);
    return NextResponse.json({ error: "Failed to create quote" }, { status: 500 });
  }
}
