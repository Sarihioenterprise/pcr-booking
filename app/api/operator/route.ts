import { NextRequest, NextResponse } from "next/server";
import { getOperatorFromRequest } from "@/lib/get-operator-from-request";

/**
 * GET /api/operator — returns the authenticated operator's profile.
 * Supports both cookie-based sessions and Bearer JWT auth.
 */
export async function GET(request: NextRequest) {
  const result = await getOperatorFromRequest(request);
  if (result.error) return result.error;
  const { operator } = result;

  return NextResponse.json({ operator });
}
