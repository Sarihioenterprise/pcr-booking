import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

export async function GET() {
  try {
    const operator = await getOperator();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("expenses")
      .select("*, vehicles(make, model, year)")
      .eq("operator_id", operator.id)
      .order("expense_date", { ascending: false });

    if (error) {
      // Table may not exist yet — return empty array instead of 500
      if (error.code === "PGRST205" || error.message?.includes("expenses")) {
        return NextResponse.json([]);
      }
      throw error;
    }
    return NextResponse.json(data || []);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch expenses";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const operator = await getOperator();
    const supabase = createAdminClient();
    const body = await req.json();

    const { category, amount, description, expense_date, vehicle_id } = body;
    if (!category || !amount || !expense_date) {
      return NextResponse.json({ error: "category, amount, and expense_date are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        operator_id: operator.id,
        category,
        amount: parseFloat(amount),
        description: description || null,
        expense_date,
        vehicle_id: vehicle_id || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST205" || error.message?.includes("expenses")) {
        return NextResponse.json({ error: "Expenses table not yet created. Apply migration 040_expenses.sql in Supabase dashboard." }, { status: 503 });
      }
      throw error;
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create expense";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
