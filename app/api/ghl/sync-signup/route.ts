import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncSignup } from "@/lib/ghl";

export async function POST(request: NextRequest) {
  try {
    const { operatorId } = await request.json();

    if (!operatorId) {
      return NextResponse.json(
        { error: "operatorId is required" },
        { status: 400 }
      );
    }

    // Fetch full operator details from database
    const supabase = createAdminClient();
    const { data: operator, error } = await supabase
      .from("operators")
      .select("id, business_email, owner_name, business_name, phone, booking_slug, created_at, user_id")
      .eq("id", operatorId)
      .single();

    if (error || !operator) {
      console.error("[GHL sync-signup] Failed to fetch operator:", error);
      return NextResponse.json({ success: false }, { status: 200 }); // Fire and forget
    }

    // Resolve email: prefer business_email, fall back to auth user email
    let email = operator.business_email ?? null;
    if (!email || email.trim() === "") {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(operator.user_id);
        email = authUser?.user?.email ?? null;
      } catch { /* non-fatal */ }
    }

    if (!email) {
      console.warn("[GHL sync-signup] No email for operator:", operatorId);
      return NextResponse.json({ success: false }, { status: 200 });
    }

    // Fire GHL signup sync (fire and forget — never breaks user flow)
    syncSignup({
      id: operator.id,
      email,
      owner_name: operator.owner_name ?? undefined,
      business_name: operator.business_name ?? undefined,
      phone: operator.phone ?? null,
      booking_slug: operator.booking_slug ?? null,
      created_at: operator.created_at ?? undefined,
    }).catch((err) => console.error("[GHL sync-signup] syncSignup failed:", err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[GHL sync-signup] Error:", err);
    return NextResponse.json({ success: false }, { status: 200 }); // Fire and forget
  }
}
