import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json({ valid: false, error: "code is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: promo } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .eq("is_active", true)
    .single();

  if (!promo) {
    return NextResponse.json({ valid: false });
  }

  const now = new Date().toISOString();
  if ((promo.valid_from && now < promo.valid_from) ||
      (promo.valid_until && now > promo.valid_until) ||
      (promo.max_uses !== null && promo.used_count >= promo.max_uses)) {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    type: promo.type,
    value: promo.value,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, operator_id } = body;

    if (!code || !operator_id) {
      return NextResponse.json(
        { valid: false, error: "Missing required fields: code, operator_id" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: promo, error } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("operator_id", operator_id)
      .eq("code", code.toUpperCase().trim())
      .single();

    if (error || !promo) {
      return NextResponse.json(
        { valid: false, error: "Promo code not found" },
        { status: 404 }
      );
    }

    if (!promo.is_active) {
      return NextResponse.json(
        { valid: false, error: "Promo code is no longer active" }
      );
    }

    const now = new Date().toISOString();

    if (promo.valid_from && now < promo.valid_from) {
      return NextResponse.json(
        { valid: false, error: "Promo code is not yet valid" }
      );
    }

    if (promo.valid_until && now > promo.valid_until) {
      return NextResponse.json(
        { valid: false, error: "Promo code has expired" }
      );
    }

    if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
      return NextResponse.json(
        { valid: false, error: "Promo code has reached maximum uses" }
      );
    }

    return NextResponse.json({
      valid: true,
      promo: {
        id: promo.id,
        code: promo.code,
        type: promo.type,
        value: promo.value,
        description: promo.description,
        min_rental_days: promo.min_rental_days,
      },
    });
  } catch (err) {
    console.error("Promo validation error:", err);
    return NextResponse.json(
      { valid: false, error: "Failed to validate promo code" },
      { status: 500 }
    );
  }
}
