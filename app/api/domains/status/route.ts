import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkVercelDomainStatus } from "@/lib/vercel-domains";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: operator } = await admin
      .from("operators")
      .select("id, custom_domain, custom_domain_status")
      .eq("user_id", user.id)
      .single();

    if (!operator) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const domain = (operator as any).custom_domain as string | null;

    if (!domain) {
      return NextResponse.json({ domain: null, status: null });
    }

    // Poll Vercel for current status
    const vercelStatus = await checkVercelDomainStatus(domain);
    const newStatus = vercelStatus.verified ? "active" : "pending";

    // Update DB status if changed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentStatus = (operator as any).custom_domain_status;
    if (currentStatus !== newStatus) {
      await admin
        .from("operators")
        .update({ custom_domain_status: newStatus } as Record<string, unknown>)
        .eq("id", operator.id);
    }

    return NextResponse.json({
      domain,
      status: newStatus,
      verified: vercelStatus.verified,
      dnsInstructions: vercelStatus.dnsInstructions,
    });
  } catch (err) {
    console.error("[domains/status] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
