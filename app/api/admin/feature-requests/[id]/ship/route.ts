import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/ghl";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: fr, error: frError } = await supabase
    .from("feature_requests")
    .select("id, summary, description, status")
    .eq("id", id)
    .single();

  if (frError || !fr) {
    return NextResponse.json({ error: "Feature request not found" }, { status: 404 });
  }

  if (fr.status === "shipped") {
    return NextResponse.json({ error: "Already shipped" }, { status: 409 });
  }

  // Mark shipped
  const { error: updateError } = await supabase
    .from("feature_requests")
    .update({ status: "shipped", shipped_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }

  // Get all operators who requested this feature (via linked support emails)
  const { data: linked } = await supabase
    .from("feature_request_emails")
    .select("support_email_id")
    .eq("feature_request_id", id);

  const emailIds = (linked ?? []).map((r) => r.support_email_id);

  let announced = 0;

  if (emailIds.length > 0) {
    const { data: supportEmails } = await supabase
      .from("support_emails")
      .select("operator_id")
      .in("id", emailIds)
      .not("operator_id", "is", null);

    const operatorIds = [
      ...new Set((supportEmails ?? []).map((e) => e.operator_id as string)),
    ];

    if (operatorIds.length > 0) {
      const { data: operators } = await supabase
        .from("operators")
        .select("id, ghl_contact_id")
        .in("id", operatorIds)
        .not("ghl_contact_id", "is", null);

      const description = fr.description ?? fr.summary;

      for (const op of operators ?? []) {
        await sendEmail(op.ghl_contact_id as string, {
          subject: `Feature update: ${fr.summary} is now live`,
          body: `You asked for this a while back. We built it.\n\n${description}\n\nGo check it out: https://pcrbooking.com/dashboard`,
        });
        announced++;
      }
    }
  }

  await supabase
    .from("feature_requests")
    .update({ announcement_sent: true })
    .eq("id", id);

  return NextResponse.json({ success: true, announced });
}
