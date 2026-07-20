import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fireGHLEvent } from "@/lib/ghl";

export async function POST(request: NextRequest) {
  try {
    const { operatorId, businessName, ownerName, phone } = await request.json();

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
      .select("*")
      .eq("id", operatorId)
      .single();

    if (error || !operator) {
      console.error("[GHL] Failed to fetch operator:", error);
      return NextResponse.json({ success: false }, { status: 200 }); // Fire and forget
    }

    // Fire GHL event (fire and forget)
    const note = `Signed up for PCR Booking on ${new Date().toLocaleDateString()}`;
    await fireGHLEvent(operator, "pcr-booking-signup", note);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[GHL sync-signup] Error:", err);
    return NextResponse.json({ success: false }, { status: 200 }); // Fire and forget
  }
}
