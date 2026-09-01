import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: operator, error: operatorError } = await admin
      .from('operators')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (operatorError || !operator) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 403 });
    }

    const body = await request.json();
    const { renterId, renterEmail, renterName, renterDob, renterLicenseNumber, renterLicenseState } = body;

    if (!renterEmail || !renterName || !renterDob || !renterLicenseNumber || !renterLicenseState) {
      return NextResponse.json({ error: 'Missing required renter fields' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 5000,
      currency: 'usd',
      metadata: {
        type: 'driver_check',
        operatorId: operator.id,
      },
    });

    const { data: check, error: checkError } = await admin
      .from('driver_checks')
      .insert({
        operator_id: operator.id,
        renter_id: renterId ?? null,
        renter_email: renterEmail,
        renter_name: renterName,
        renter_dob: renterDob,
        renter_license_number: renterLicenseNumber,
        renter_license_state: renterLicenseState,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
      })
      .select('id')
      .single();

    if (checkError || !check) {
      return NextResponse.json({ error: 'Failed to create driver check record' }, { status: 500 });
    }

    return NextResponse.json({
      checkId: check.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error('[driver-checks/initiate]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
