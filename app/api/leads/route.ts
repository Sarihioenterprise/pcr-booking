import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operator_id, name, phone, email, dates_requested, duration_days } =
      body;

    if (!operator_id || !name || !phone || !email) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("leads")
      .insert({
        operator_id,
        name,
        phone,
        email,
        dates_requested,
        duration_days,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to insert lead:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create lead" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, lead_id: data.id },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error("Lead submission error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
