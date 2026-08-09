import { NextRequest, NextResponse } from "next/server";
import { getOperator } from "@/lib/get-operator";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/addons — list operator's add-ons (dashboard, authenticated)
export async function GET() {
  try {
    const operator = await getOperator();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("addons")
      .select("*")
      .eq("operator_id", operator.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      // Table may not exist yet (migration pending)
      // Handles Postgres 42P01 + PostgREST schema cache errors
      const isTableMissing =
        error.code === "42P01" ||
        (error.message && error.message.includes("addons"));
      if (isTableMissing) {
        return NextResponse.json({ addons: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ addons: data ?? [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/addons — create a new add-on (dashboard, authenticated)
export async function POST(request: NextRequest) {
  try {
    const operator = await getOperator();
    const supabase = createAdminClient();
    const body = await request.json();

    const {
      name,
      description,
      pricing_type,
      price,
      category,
      required,
      sort_order,
    } = body;

    if (!name || price === undefined || price === null) {
      return NextResponse.json(
        { error: "name and price are required" },
        { status: 400 }
      );
    }

    if (!["per_day", "flat"].includes(pricing_type)) {
      return NextResponse.json(
        { error: "pricing_type must be per_day or flat" },
        { status: 400 }
      );
    }

    if (!["insurance", "extra"].includes(category)) {
      return NextResponse.json(
        { error: "category must be insurance or extra" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("addons")
      .insert({
        operator_id: operator.id,
        name,
        description: description || null,
        pricing_type,
        price: Number(price),
        category,
        required: Boolean(required),
        active: true,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json(
          { error: "Add-ons table not yet created. Please apply migration 018." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ addon: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
