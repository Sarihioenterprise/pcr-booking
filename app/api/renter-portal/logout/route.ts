import { NextResponse } from "next/server";
import { RENTER_SESSION_COOKIE } from "@/lib/renter-portal-jwt";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://pcrbooking.com";

export async function GET() {
  const response = NextResponse.redirect(
    `${APP_URL}/renter-portal/login?logged_out=1`
  );

  response.cookies.set(RENTER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
