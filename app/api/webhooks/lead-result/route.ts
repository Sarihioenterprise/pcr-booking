import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      lead_id,
      operator_id,
      uber_lyft_approved,
      valid_license,
      age_25_plus,
      stage,
      disqualify_reason,
      transcript,
    } = body;

    if (!lead_id || !operator_id) {
      return NextResponse.json(
        { success: false, error: "Missing lead_id or operator_id" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("leads")
      .update({
        uber_lyft_approved,
        valid_license,
        age_25_plus,
        stage,
        disqualify_reason,
        call_transcript: transcript,
      })
      .eq("id", lead_id)
      .eq("operator_id", operator_id);

    if (error) {
      console.error("Failed to update lead:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update lead" },
        { status: 500 }
      );
    }

    if (stage === "hot_lead") {
      // TODO: Send notification to operator (email, SMS, or push)
      console.log(
        `[NOTIFICATION] Hot lead detected — lead_id: ${lead_id}, operator_id: ${operator_id}`
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Lead result webhook error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
