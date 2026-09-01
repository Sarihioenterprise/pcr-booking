import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Maps Checkr event types to background_check_status values on the operators table.
// Only report.completed changes the terminal status; report.created marks pending.
const EVENT_STATUS_MAP: Record<string, string | null> = {
  'report.created': 'pending',
  'report.completed': null, // resolved from report.result below
  'candidate.driver_license_filled': null, // informational only
};

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    const rawBody = await request.text();
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = payload.type as string | undefined;
  if (!type || !(type in EVENT_STATUS_MAP)) {
    return NextResponse.json({ received: true });
  }

  const data = payload.data as Record<string, unknown> | undefined;
  const obj = data?.object as Record<string, unknown> | undefined;

  if (!obj) {
    return NextResponse.json({ received: true });
  }

  const candidateId = (obj.candidate_id ?? obj.id) as string | undefined;
  if (!candidateId) {
    return NextResponse.json({ received: true });
  }

  // candidate.driver_license_filled — log only
  if (type === 'candidate.driver_license_filled') {
    console.info('[checkr/webhook] driver_license_filled for candidate', candidateId);
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();
  const { data: operator } = await admin
    .from('operators')
    .select('id')
    .eq('checkr_candidate_id', candidateId)
    .single();

  if (!operator) {
    console.warn('[checkr/webhook] no operator found for candidate_id', candidateId);
    return NextResponse.json({ received: true });
  }

  let newStatus: string;
  if (type === 'report.completed') {
    const result = obj.result as string | null;
    newStatus = result === 'clear' || result === 'consider' ? result : 'pending';
  } else {
    newStatus = EVENT_STATUS_MAP[type] as string;
  }

  const updatePayload: Record<string, unknown> = {
    background_check_status: newStatus,
  };
  if (type === 'report.completed') {
    updatePayload.background_check_completed_at = new Date().toISOString();
  }

  await admin
    .from('operators')
    .update(updatePayload)
    .eq('id', operator.id);

  console.info('[checkr/webhook]', type, '→ status', newStatus, 'for operator', operator.id);
  return NextResponse.json({ received: true });
}
