import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeVercelDomain } from "@/lib/vercel-domains";

export async function POST() {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const domain = (operator as any).custom_domain as string | null;

    if (!domain) {
      return NextResponse.json({ ok: true, message: "No domain to disconnect" });
    }

    // Remove from Vercel project
    const vercelResult = await removeVercelDomain(domain);
    if (!vercelResult.ok) {
      console.warn("[domains/disconnect] Vercel removal failed:", vercelResult.error);
      // Continue with DB cleanup even if Vercel fails
    }

    // Clear from DB
    const { error: dbError } = await admin
      .from("operators")
      .update({
        custom_domain: null,
        custom_domain_status: null,
      } as Record<string, unknown>)
      .eq("id", operator.id);

    if (dbError) {
      console.warn("[domains/disconnect] DB update failed:", dbError.message);
      return NextResponse.json(
        { error: "Failed to clear domain from database" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, removed: domain });
  } catch (err) {
    console.error("[domains/disconnect] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
