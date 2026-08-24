import { NextRequest, NextResponse } from "next/server";
import {
  verifyRenterToken,
  signSessionToken,
  RENTER_SESSION_COOKIE,
} from "@/lib/renter-portal-jwt";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://pcrbooking.com";

/**
 * GET /api/renter-portal/verify?token=<magic-jwt>
 *
 * Validates the magic link token, issues a 7-day session cookie,
 * then redirects the renter to their dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      `${APP_URL}/renter-portal/login?error=missing_token`
    );
  }

  const payload = await verifyRenterToken(token);

  if (!payload || payload.type !== "magic") {
    return NextResponse.redirect(
      `${APP_URL}/renter-portal/login?error=invalid_token`
    );
  }

  // Issue a session token (7 days)
  const sessionToken = await signSessionToken(payload.sub, payload.email);

  // Redirect to dashboard and set session cookie
  const response = NextResponse.redirect(
    `${APP_URL}/renter-portal/dashboard`
  );

  response.cookies.set(RENTER_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
