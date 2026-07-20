import { NextResponse } from "next/server";

// Express onboarding no longer needs a callback route
// Stripe redirects directly to return_url after user completes onboarding

export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
