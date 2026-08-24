import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { fireGHLEvent } from "@/lib/ghl";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * POST-ONBOARDING VERIFICATION
 *
 * Stripe redirects here after the user completes (or exits) the Express
 * onboarding flow. We call stripe.accounts.retrieve() to get the real
 * completion state before deciding which URL to send the operator to.
 *
 *   details_submitted: true  → active, redirect to ?stripe=connected
 *   details_submitted: false → incomplete, redirect to ?stripe=incomplete
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${APP_URL}/auth/login`);
  }

  try {
    // Fetch the operator's Stripe account ID
    const { data: operator, error: operatorError } = await supabase
      .from("operators")
      .select("id, stripe_account_id, stripe_connect_status")
      .eq("user_id", user.id)
      .single();

    if (operatorError || !operator || !operator.stripe_account_id) {
      // No account ID — something went wrong before onboarding even started
      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?stripe=error&error=${encodeURIComponent(
          "No Stripe account found. Please try connecting again."
        )}`
      );
    }

    // Live verification against Stripe
    const account = await stripe.accounts.retrieve(operator.stripe_account_id);

    const detailsSubmitted = account.details_submitted ?? false;
    const chargesEnabled = account.charges_enabled ?? false;
    const payoutsEnabled = account.payouts_enabled ?? false;

    const adminClient = createAdminClient();

    if (!detailsSubmitted) {
      // Operator hit "Back" or abandoned onboarding — mark incomplete
      await adminClient
        .from("operators")
        .update({
          stripe_connect_status: "incomplete",
          updated_at: new Date().toISOString(),
        })
        .eq("id", operator.id);

      return NextResponse.redirect(
        `${APP_URL}/dashboard/settings?stripe=incomplete`
      );
    }

    // Onboarding finished — mark active and persist enabled flags
    const { data: updated } = await adminClient
      .from("operators")
      .update({
        stripe_connect_status: "active",
        charges_enabled: chargesEnabled,
        payouts_enabled: payoutsEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", operator.id)
      .select()
      .single();

    // Fire GHL event (fire-and-forget)
    if (updated && operator.stripe_connect_status !== "active") {
      const note = `Connected Stripe account on ${new Date().toLocaleDateString()}`;
      fireGHLEvent(updated, "stripe-connected", note).catch((err) =>
        console.error("[GHL] stripe-connected event failed:", err)
      );
    }

    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?stripe=connected`
    );
  } catch (error) {
    console.error("Stripe verify error:", error);

    let message = "Failed to verify Stripe connection. Please try again.";
    if (error && typeof error === "object") {
      const stripeErr = error as {
        message?: string;
        raw?: { message?: string };
      };
      const detail = stripeErr.raw?.message || stripeErr.message;
      if (detail) message = detail;
    }

    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?stripe=error&error=${encodeURIComponent(
        message
      )}`
    );
  }
}
