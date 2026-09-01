import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const FEATURE_REQUEST_KEYWORDS = [
  "add", "feature", "wish", "would be nice", "can you add",
  "ability to", "option to", "support for",
];
const SUPPORT_KEYWORDS = [
  "bug", "broken", "error", "doesn't work", "not working",
  "issue", "problem",
];

function classifyEmail(body: string): "feature_request" | "support" | "general" {
  const lower = body.toLowerCase();
  if (FEATURE_REQUEST_KEYWORDS.some((kw) => lower.includes(kw))) return "feature_request";
  if (SUPPORT_KEYWORDS.some((kw) => lower.includes(kw))) return "support";
  return "general";
}

function extractKeywords(body: string): string[] {
  const lower = body.toLowerCase();
  return FEATURE_REQUEST_KEYWORDS.filter((kw) => lower.includes(kw));
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.INBOUND_EMAIL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: {
    from: string;
    from_name?: string;
    subject?: string;
    body: string;
    operator_id?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.from || !payload.body) {
    return NextResponse.json({ error: "Missing required fields: from, body" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Look up operator by email if not provided
  let operatorId = payload.operator_id ?? null;
  if (!operatorId) {
    const { data: op } = await supabase
      .from("operators")
      .select("id")
      .eq("business_email", payload.from)
      .maybeSingle();
    operatorId = op?.id ?? null;
  }

  const classification = classifyEmail(payload.body);
  const summary = payload.body.slice(0, 200);

  // Save inbound email
  const { data: savedEmail, error: emailError } = await supabase
    .from("support_emails")
    .insert({
      from_email: payload.from,
      from_name: payload.from_name ?? null,
      subject: payload.subject ?? null,
      body: payload.body,
      operator_id: operatorId,
      classification,
      raw_payload: payload as unknown as Record<string, unknown>,
      processed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (emailError || !savedEmail) {
    console.error("[inbound-email] Failed to save email:", emailError);
    return NextResponse.json({ error: "Failed to save email" }, { status: 500 });
  }

  // Handle feature requests
  if (classification === "feature_request") {
    const keywords = extractKeywords(payload.body);

    // Try to find an existing feature request with overlapping keywords
    const { data: existing } = await supabase
      .from("feature_requests")
      .select("id, request_count, tags")
      .filter("tags", "ov", `{${keywords.join(",")}}`)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    let featureRequestId: string;

    if (existing) {
      await supabase
        .from("feature_requests")
        .update({ request_count: (existing.request_count ?? 1) + 1 })
        .eq("id", existing.id);
      featureRequestId = existing.id;
    } else {
      const { data: created, error: frError } = await supabase
        .from("feature_requests")
        .insert({
          summary,
          description: payload.body,
          tags: keywords,
        })
        .select("id")
        .single();

      if (frError || !created) {
        console.error("[inbound-email] Failed to create feature request:", frError);
        return NextResponse.json({ success: true }); // non-fatal
      }
      featureRequestId = created.id;
    }

    await supabase.from("feature_request_emails").insert({
      feature_request_id: featureRequestId,
      support_email_id: savedEmail.id,
    });
  }

  return NextResponse.json({ success: true });
}
