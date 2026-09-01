import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const CHECKR_BASE = 'https://api.checkr.com/v1';

function checkrAuthHeader(): string {
  const key = process.env.CHECKR_API_KEY!;
  const encoded = Buffer.from(`${key}:`).toString('base64');
  return `Basic ${encoded}`;
}

async function checkrPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${CHECKR_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: checkrAuthHeader(),
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

export async function POST(
  request: NextRequest,
  { params }: { params: { checkId: string } }
) {
  try {
    const { checkId } = params;

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

    const { data: check, error: checkError } = await admin
      .from('driver_checks')
      .select('*')
      .eq('id', checkId)
      .eq('operator_id', operator.id)
      .single();

    if (checkError || !check) {
      return NextResponse.json({ error: 'Driver check not found' }, { status: 404 });
    }

    if (check.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot submit check in status: ${check.status}` },
        { status: 409 }
      );
    }

    const nameParts = (check.renter_name as string).trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    const candidate = await checkrPost('/candidates', {
      email: check.renter_email,
      first_name: firstName,
      last_name: lastName,
      dob: check.renter_dob,
      driver_license_number: check.renter_license_number,
      driver_license_state: check.renter_license_state,
    });

    const invitation = await checkrPost('/invitations', {
      candidate_id: candidate.id,
      package: 'driver_pro',
      work_locations: [{ state: check.renter_license_state }],
    });

    const { error: updateError } = await admin
      .from('driver_checks')
      .update({
        checkr_candidate_id: candidate.id,
        checkr_invitation_id: invitation.id,
        status: 'consent_sent',
      })
      .eq('id', checkId);

    if (updateError) {
      console.error('[driver-checks/submit] DB update failed:', updateError);
      return NextResponse.json({ error: 'Failed to update driver check record' }, { status: 500 });
    }

    return NextResponse.json({ status: 'consent_sent' });
  } catch (err) {
    console.error('[driver-checks/submit]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
