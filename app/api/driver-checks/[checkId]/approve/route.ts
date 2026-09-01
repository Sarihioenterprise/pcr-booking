import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { checkId: string } }
) {
  try {
    const supabaseServer = createServerClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { status, reason } = body as { status: "approved" | "disapproved" | "flagged"; reason?: string };

    if (!["approved", "disapproved", "flagged"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify operator owns this check
    const { data: operator } = await supabase
      .from("operators")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

    const { data: check } = await supabase
      .from("driver_checks")
      .select("id, operator_id")
      .eq("id", params.checkId)
      .eq("operator_id", operator.id)
      .single();

    if (!check) return NextResponse.json({ error: "Check not found" }, { status: 404 });

    const { data: updated, error } = await supabase
      .from("driver_checks")
      .update({
        approval_status: status,
        approval_reason: reason ?? null,
        manually_approved_at: new Date().toISOString(),
        manually_approved_by: user.id,
        auto_approved_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.checkId)
      .select()
      .single();

    if (error) {
      console.error("[approve-check] DB error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, check: updated });
  } catch (err) {
    console.error("[approve-check] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
