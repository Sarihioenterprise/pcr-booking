import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

// Diagnostic GET endpoint - requires service role key
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Fail closed: reject if env var is missing or header doesn't match
  if (!serviceKey || !authHeader || !authHeader.includes(serviceKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const operatorId = request.nextUrl.searchParams.get("operator_id");
  if (!operatorId) {
    return NextResponse.json({ error: "operator_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("id, make, model, year, status")
    .eq("operator_id", operatorId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ vehicles, count: vehicles?.length || 0 });
}

const PLAN_LIMITS: Record<string, number> = {
  growth: 15,
  pro: 40,
  scale: 100,
  fleet: Infinity,
};

export async function POST(request: NextRequest) {
  try {
    const operator = await getOperator();
    const supabase = createAdminClient();
    const body = await request.json();

    // Server-side vehicle limit enforcement (prevents API bypass of client-side cap)
    const planLimit = PLAN_LIMITS[operator.plan] ?? 15;
    if (planLimit !== Infinity) {
      const { count } = await supabase
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .eq("operator_id", operator.id);
      if ((count ?? 0) >= planLimit) {
        return NextResponse.json(
          { error: `Vehicle limit reached for your ${operator.plan} plan (max ${planLimit}). Upgrade to add more vehicles.` },
          { status: 403 }
        );
      }
    }

    const {
      make, model, year, color, plate, vin,
      daily_rate, weekly_rate, monthly_rate,
      mileage, fuel_level, category,
      purchase_price, monthly_cost,
      minimum_rental_days, location_id,
      photo_url, status, notes,
    } = body;

    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        make, model, year, color, plate, vin,
        daily_rate, weekly_rate, monthly_rate,
        mileage, fuel_level, category,
        purchase_price, monthly_cost,
        minimum_rental_days, location_id,
        photo_url, status, notes,
        operator_id: operator.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create vehicle" }, { status: 500 });
  }
}
