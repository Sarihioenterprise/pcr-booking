/**
 * GET    /api/quotes/[id]  — fetch single quote
 * PATCH  /api/quotes/[id]  — update status or fields
 * DELETE /api/quotes/[id]  — delete quote
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

type Params = { params: Promise<{ id: string }> };

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;

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

    const { data: quote, error } = await supabase
      .from("quotes")
      .select(`
        *,
        vehicles(id, make, model, year, photo_url, daily_rate, category),
        renters(id, name, email, phone)
      `)
      .eq("id", id)
      .eq("operator_id", operator.id)
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (err) {
    console.error("GET /api/quotes/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch quote" }, { status: 500 });
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;

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
    const supabase = createAdminClient();

    // Only allow updating specific fields
    const allowed = ["status", "notes", "expires_at", "customer_name", "customer_email", "customer_phone"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    // Validate status transitions
    if (updates.status) {
      const validStatuses = ["draft", "pending", "sent", "accepted", "declined", "expired"];
      if (!validStatuses.includes(updates.status as string)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      // Set declined_at when declining
      if (updates.status === "declined") {
        updates.declined_at = new Date().toISOString();
      }
    }

    const { data: quote, error } = await supabase
      .from("quotes")
      .update(updates)
      .eq("id", id)
      .eq("operator_id", operator.id)
      .select(`
        *,
        vehicles(id, make, model, year, photo_url, daily_rate),
        renters(id, name, email, phone)
      `)
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: error?.message ?? "Quote not found" }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (err) {
    console.error("PATCH /api/quotes/[id] error:", err);
    return NextResponse.json({ error: "Failed to update quote" }, { status: 500 });
  }
}

// ─── DELETE ─────────────────────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;

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

    const { error } = await supabase
      .from("quotes")
      .delete()
      .eq("id", id)
      .eq("operator_id", operator.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/quotes/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete quote" }, { status: 500 });
  }
}
