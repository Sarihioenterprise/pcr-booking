/**
 * GET    /api/renters/[id]/payment-methods  — list saved cards for a renter (via Stripe)
 * POST   /api/renters/[id]/payment-methods  — create SetupIntent to save a new card
 * DELETE /api/renters/[id]/payment-methods  — remove a saved card (body: { paymentMethodId })
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";
import { getStripe } from "@/lib/stripe";

type Params = { params: Promise<{ id: string }> };

/**
 * Ensure the renter has a Stripe Customer record.
 * Creates one if stripe_customer_id is null and persists it.
 */
async function ensureStripeCustomer(
  supabase: ReturnType<typeof createAdminClient>,
  renter: { id: string; name: string; email: string | null; stripe_customer_id: string | null },
  operatorAccountId: string | null
): Promise<string> {
  if (renter.stripe_customer_id) return renter.stripe_customer_id;

  const stripe = getStripe();

  // Create Stripe customer on the platform account
  const customer = await stripe.customers.create({
    name: renter.name,
    email: renter.email ?? undefined,
    metadata: { renter_id: renter.id },
  });

  // Persist customer ID on renter record
  await supabase
    .from("renters")
    .update({ stripe_customer_id: customer.id })
    .eq("id", renter.id);

  return customer.id;
}

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

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
    const supabase = createAdminClient();

    const { data: renter, error } = await supabase
      .from("renters")
      .select("id, name, email, stripe_customer_id")
      .eq("id", id)
      .eq("operator_id", operator.id)
      .single();

    if (error || !renter) {
      return NextResponse.json({ error: "Renter not found" }, { status: 404 });
    }

    if (!renter.stripe_customer_id) {
      // No customer yet — return empty list
      return NextResponse.json([]);
    }

    const stripe = getStripe();
    const paymentMethods = await stripe.paymentMethods.list({
      customer: renter.stripe_customer_id,
      type: "card",
    });

    // Check default payment method
    const customer = await stripe.customers.retrieve(renter.stripe_customer_id);
    const defaultPmId =
      !("deleted" in customer) && customer.invoice_settings?.default_payment_method
        ? String(customer.invoice_settings.default_payment_method)
        : null;

    const cards = paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand ?? "card",
      last4: pm.card?.last4 ?? "****",
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
      is_default: pm.id === defaultPmId,
      created: pm.created,
    }));

    return NextResponse.json(cards);
  } catch (err) {
    console.error("GET payment-methods error:", err);
    return NextResponse.json({ error: "Failed to fetch payment methods" }, { status: 500 });
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;

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
    const supabase = createAdminClient();

    const { data: renter, error } = await supabase
      .from("renters")
      .select("id, name, email, stripe_customer_id")
      .eq("id", id)
      .eq("operator_id", operator.id)
      .single();

    if (error || !renter) {
      return NextResponse.json({ error: "Renter not found" }, { status: 404 });
    }

    const customerId = await ensureStripeCustomer(
      supabase,
      renter,
      operator.stripe_account_id ?? null
    );

    const stripe = getStripe();

    // Create SetupIntent so renter can enter card details in Stripe Elements
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: {
        renter_id: id,
        operator_id: operator.id,
      },
    });

    return NextResponse.json({
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id,
      stripe_customer_id: customerId,
    });
  } catch (err) {
    console.error("POST payment-methods error:", err);
    return NextResponse.json({ error: "Failed to create setup intent" }, { status: 500 });
  }
}

// ─── DELETE ─────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;

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
    const body = await request.json();
    const { paymentMethodId } = body;

    if (!paymentMethodId) {
      return NextResponse.json({ error: "paymentMethodId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify renter belongs to operator
    const { data: renter, error } = await supabase
      .from("renters")
      .select("id, stripe_customer_id")
      .eq("id", id)
      .eq("operator_id", operator.id)
      .single();

    if (error || !renter) {
      return NextResponse.json({ error: "Renter not found" }, { status: 404 });
    }

    if (!renter.stripe_customer_id) {
      return NextResponse.json({ error: "No saved cards for this renter" }, { status: 400 });
    }

    const stripe = getStripe();

    // Verify this PM belongs to this customer
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== renter.stripe_customer_id) {
      return NextResponse.json({ error: "Payment method does not belong to this renter" }, { status: 403 });
    }

    // Detach removes it from the customer
    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE payment-methods error:", err);
    return NextResponse.json({ error: "Failed to remove payment method" }, { status: 500 });
  }
}
