import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCustomDomain } from "@/lib/plan-tier";
import { addVercelDomain } from "@/lib/vercel-domains";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: operator } = await admin
      .from("operators")
      .select("id, plan, custom_domain")
      .eq("user_id", user.id)
      .single();

    if (!operator) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    // Plan gate: Growth+ only
    if (!canUseCustomDomain(operator.plan)) {
      return NextResponse.json(
        { error: "Custom domains require Growth plan or above" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const domain = (body.domain as string | undefined)?.toLowerCase().trim();

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    // Basic domain validation
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });
    }

    // Block pcrbooking.com itself
    if (domain === "pcrbooking.com" || domain === "www.pcrbooking.com") {
      return NextResponse.json({ error: "Cannot use pcrbooking.com as a custom domain" }, { status: 400 });
    }

    // Add domain to Vercel project
    const vercelResult = await addVercelDomain(domain);
    if (!vercelResult.ok) {
      return NextResponse.json(
        { error: `Failed to add domain to Vercel: ${vercelResult.error}` },
        { status: 500 }
      );
    }

    // Store in DB with graceful fallback if columns don't exist yet (migration 017 pending)
    const { error: dbError } = await admin
      .from("operators")
      .update({
        custom_domain: domain,
        custom_domain_status: "pending",
      } as Record<string, unknown>)
      .eq("id", operator.id);

    if (dbError) {
      // Column may not exist yet — log and return partial success
      console.warn("[domains/connect] DB update failed (run migration 017?):", dbError.message);
      return NextResponse.json({
        ok: true,
        domain,
        status: "pending",
        warning: "Domain added to Vercel but DB not updated (migration 017 pending)",
      });
    }

    return NextResponse.json({
      ok: true,
      domain,
      status: "pending",
    });
  } catch (err) {
    console.error("[domains/connect] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
