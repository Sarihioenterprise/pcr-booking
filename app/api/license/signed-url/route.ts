/**
 * POST /api/license/signed-url
 *
 * Generate a short-lived signed URL for a license file in the private `licenses` bucket.
 * Requires operator authentication (only the owning operator can view).
 *
 * Body: { path: string }
 * Returns: { signedUrl: string, expiresIn: number }
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

const SIGNED_URL_EXPIRY_SECONDS = 300; // 5 minutes

export async function POST(request: NextRequest) {
  let operator;
  try {
    operator = await getOperator();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("NEXT_REDIRECT") || (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  try {
    const { path } = await request.json();

    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    // Security: the path must start with the operator's ID to prevent cross-tenant access
    if (!path.startsWith(operator.id + "/")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase.storage
      .from("licenses")
      .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message || "Failed to generate signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      expiresIn: SIGNED_URL_EXPIRY_SECONDS,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate signed URL";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
