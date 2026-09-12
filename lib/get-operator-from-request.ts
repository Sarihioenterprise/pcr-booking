import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Operator } from "@/lib/types";

/**
 * Resolves the authenticated operator from an API request.
 *
 * Supports two auth paths:
 *   1. Bearer JWT in the Authorization header (e.g. Supabase access_token)
 *   2. Falls back to cookie-based session via getOperator() when no header present
 *
 * Returns { operator } on success, or { error: NextResponse } on failure.
 */
export async function getOperatorFromRequest(
  request: NextRequest
): Promise<{ operator: Operator; error?: never } | { operator?: never; error: NextResponse }> {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();

    // Verify the JWT against Supabase using the anon client with the user's token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      return {
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    const adminSupabase = createAdminClient();
    const { data: operator } = await adminSupabase
      .from("operators")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!operator) {
      return {
        error: NextResponse.json({ error: "Operator not found" }, { status: 404 }),
      };
    }

    // Mirror the normalization done in getOperator()
    if (!(operator as any).charges_enabled) {
      (operator as any).charges_enabled = (operator as any).stripe_connect_status === "active";
    }
    if (!(operator as any).payouts_enabled) {
      (operator as any).payouts_enabled = (operator as any).stripe_connect_status === "active";
    }

    const DEMO_EMAILS = ["demo@pcrbooking.com", "hoor@pcrbooking.com"];
    const OWNER_EMAILS = new Set(["aguytonestate@gmail.com", "aguytonestation@gmail.com"]);
    const isDemoAccount = DEMO_EMAILS.includes(operator.business_email ?? "");
    const isOwner = OWNER_EMAILS.has(user.email ?? "");

    if (isDemoAccount || isOwner) {
      (operator as any).charges_enabled = true;
      (operator as any).payouts_enabled = true;
    }

    return { operator: operator as Operator };
  }

  // No Bearer token — fall back to cookie-based auth
  const { getOperator } = await import("@/lib/get-operator");
  try {
    const operator = await getOperator();
    return { operator };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const digest = (err as { digest?: string }).digest ?? "";
    if (msg.includes("NEXT_REDIRECT") || digest.startsWith("NEXT_REDIRECT")) {
      return {
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
    throw err;
  }
}
