import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

const STAGE_ORDER = [
  "none",
  "1st_contact",
  "2nd_followup",
  "3rd_followup",
  "final_attempt",
  "converted",
] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operator = await getOperator();
    const supabase = await createClient();
    const { id } = await params;

    // Fetch current lead
    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("operator_id", operator.id)
      .single();

    if (fetchError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Determine next stage
    const currentIndex = STAGE_ORDER.indexOf(lead.followup_status);
    if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
      return NextResponse.json(
        { error: "Lead cannot be advanced further" },
        { status: 400 }
      );
    }

    const nextStage = STAGE_ORDER[currentIndex + 1];
    const now = new Date().toISOString();

    // Calculate next followup date (3 days from now for 1st/2nd, 5 days for 3rd, 7 for final)
    const daysUntilNext =
      nextStage === "1st_contact"
        ? 3
        : nextStage === "2nd_followup"
          ? 3
          : nextStage === "3rd_followup"
            ? 5
            : 7;

    const nextFollowup = new Date();
    nextFollowup.setDate(nextFollowup.getDate() + daysUntilNext);

    const { data: updated, error: updateError } = await supabase
      .from("leads")
      .update({
        followup_status: nextStage,
        followup_count: (lead.followup_count || 0) + 1,
        last_followup_at: now,
        next_followup_at:
          nextStage === "converted" ? null : nextFollowup.toISOString(),
        updated_at: now,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, lead: updated });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
