import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const CHECKR_BASE_URL = process.env.CHECKR_BASE_URL ?? 'https://api.staging.checkr.com';
const BACKGROUND_CHECK_PRICE_CENTS = 4900; // $49

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

function checkrAuth(): string {
  const key = process.env.CHECKR_API_KEY;
  if (!key) throw new Error('CHECKR_API_KEY not set');
  return `Basic ${Buffer.from(`${key}:`).toString('base64')}`;
}

async function checkrPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${CHECKR_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: checkrAuth(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Checkr ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`📧 [Email stub] To: ${to} | Subject: ${subject}`);
    return;
  }
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: 'PCR Booking <notifications@pcrbooking.com>',
    to: [to],
    subject,
    html,
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: operator, error: operatorError } = await admin
      .from('operators')
      .select('id, business_email, owner_name, stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (operatorError || !operator) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 403 });
    }

    const body = await request.json();
    const { firstName, lastName, email, zipcode, dob } = body as {
      firstName?: string;
      lastName?: string;
      email?: string;
      zipcode?: string;
      dob?: string;
    };

    if (!firstName || !lastName || !email || !zipcode) {
      return NextResponse.json(
        { error: 'firstName, lastName, email, and zipcode are required' },
        { status: 400 }
      );
    }

    // ── Stripe $49 charge ─────────────────────────────────────────────────────
    if (!operator.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No payment method on file. Please update your billing settings.' },
        { status: 402 }
      );
    }

    // Get operator's default payment method
    const customer = await stripe.customers.retrieve(operator.stripe_customer_id) as Stripe.Customer;
    const defaultPaymentMethod = customer.invoice_settings?.default_payment_method as string | null;

    if (!defaultPaymentMethod) {
      return NextResponse.json(
        { error: 'No default payment method found. Please add a card in billing settings.' },
        { status: 402 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: BACKGROUND_CHECK_PRICE_CENTS,
      currency: 'usd',
      customer: operator.stripe_customer_id,
      payment_method: defaultPaymentMethod,
      confirm: true,
      off_session: true,
      description: `Background check — ${firstName} ${lastName}`,
      metadata: {
        type: 'background_check',
        operatorId: operator.id,
        driverName: `${firstName} ${lastName}`,
        driverEmail: email,
      },
    });

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment failed. Please check your billing settings and try again.' },
        { status: 402 }
      );
    }

    // ── Checkr: create candidate + invitation ─────────────────────────────────
    const candidatePayload: Record<string, unknown> = {
      first_name: firstName,
      last_name: lastName,
      email,
      zipcode,
    };
    if (dob) candidatePayload.dob = dob;

    const candidate = await checkrPost('/v1/candidates', candidatePayload);

    const invitation = await checkrPost('/v1/invitations', {
      candidate_id: candidate.id,
      package: 'driver_pro',
      work_locations: [{ country: 'US', state: 'TN' }],
    });

    // ── Persist to operators table ─────────────────────────────────────────────
    await admin
      .from('operators')
      .update({
        checkr_candidate_id: candidate.id,
        checkr_invitation_url: invitation.invitation_url,
        background_check_status: 'invited',
      } as Record<string, unknown>)
      .eq('id', operator.id);

    const driverFullName = `${firstName} ${lastName}`;

    // ── Operator confirmation email ────────────────────────────────────────────
    await sendEmail(
      operator.business_email,
      `Background check initiated for ${driverFullName}`,
      `
        <div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:24px">
          <h2 style="color:#111;margin-bottom:8px">Background Check Initiated</h2>
          <p style="color:#555;margin-top:0">We've sent <strong>${driverFullName}</strong> a link to complete their background check through Checkr.</p>
          <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0;color:#333"><strong>Driver:</strong> ${driverFullName}</p>
            <p style="margin:8px 0 0;color:#333"><strong>Email:</strong> ${email}</p>
            <p style="margin:8px 0 0;color:#333"><strong>Amount charged:</strong> $49.00</p>
          </div>
          <p style="color:#555">Results typically arrive within 1–3 business days. You'll get another email when the check is complete.</p>
          <p style="color:#555">You can track the status in your <a href="https://pcrbooking.com/dashboard/settings" style="color:#2563eb">PCR Booking dashboard</a> under Settings → Compliance.</p>
          <p style="color:#999;font-size:12px;margin-top:32px">PCR Booking · pcrbooking.com</p>
        </div>
      `
    );

    // ── Driver notification email ──────────────────────────────────────────────
    await sendEmail(
      email,
      'Complete your background check to get on the road',
      `
        <div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:24px">
          <h2 style="color:#111;margin-bottom:8px">You're almost ready</h2>
          <p style="color:#555;margin-top:0">Your rental operator has started a background check as part of your driver approval. This is the last step before you can get behind the wheel.</p>
          <p style="color:#555">You'll receive a separate email from Checkr with your secure link to complete the process. It takes about 5 minutes.</p>
          <div style="background:#f0f9ff;border-left:4px solid #2563eb;padding:16px;margin:20px 0;border-radius:0 8px 8px 0">
            <p style="margin:0;color:#1e40af;font-weight:600">Check your inbox for an email from Checkr</p>
            <p style="margin:8px 0 0;color:#1e40af">If you don't see it within a few minutes, check your spam folder.</p>
          </div>
          <p style="color:#555">Questions? Reply to this email and we'll help you out.</p>
          <p style="color:#999;font-size:12px;margin-top:32px">PCR Booking · pcrbooking.com</p>
        </div>
      `
    );

    return NextResponse.json({
      invitationUrl: invitation.invitation_url,
      chargeId: paymentIntent.id,
    });
  } catch (err) {
    console.error('[checkr/invite]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
