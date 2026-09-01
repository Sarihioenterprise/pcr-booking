import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/ghl';

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.CHECKR_WEBHOOK_SECRET;
  if (!secret) return false;
  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

async function fetchFullReport(reportId: string) {
  const res = await fetch(`https://api.checkr.com/v1/reports/${reportId}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.CHECKR_API_KEY}:`).toString('base64')}`,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-checkr-signature') ?? '';

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = payload.type as string;
  const data = payload.data as Record<string, unknown> | undefined;
  const obj = data?.object as Record<string, unknown> | undefined;

  const handledEvents = ['report.completed', 'report.suspended', 'candidate.pre_adverse_action'];
  if (!handledEvents.includes(type) || !obj) {
    return NextResponse.json({ received: true });
  }

  const reportId = obj.id as string;
  const candidateId = obj.candidate_id as string;
  const status = obj.status as string;
  const result = obj.result as string | null;

  const supabase = createAdminClient();

  const { data: checkRow, error: fetchError } = await supabase
    .from('driver_checks')
    .select('*')
    .eq('checkr_candidate_id', candidateId)
    .single();

  if (fetchError || !checkRow) {
    return NextResponse.json({ received: true });
  }

  const fullReport = await fetchFullReport(reportId);

  let licenseStatus: string | null = null;
  let licenseClass: string | null = null;
  let violationsCount = 0;
  let accidentsCount = 0;

  if (fullReport) {
    const mvr = fullReport.motor_vehicle_report ?? {};
    licenseStatus = mvr.license_status ?? null;
    licenseClass = mvr.license_class ?? null;
    violationsCount = Array.isArray(mvr.violations) ? mvr.violations.length : 0;
    accidentsCount = Array.isArray(mvr.accidents) ? mvr.accidents.length : 0;
  }

  await supabase
    .from('driver_checks')
    .update({
      status: 'complete',
      result: result ?? status,
      checkr_report_id: reportId,
      report_data: fullReport,
      license_status: licenseStatus,
      license_class: licenseClass,
      violations_count: violationsCount,
      accidents_count: accidentsCount,
      completed_at: new Date().toISOString(),
    })
    .eq('id', checkRow.id);

  const resultLabel = result ?? status ?? 'unknown';
  const emailBody = [
    `Driver background check has completed for candidate ID: ${candidateId}`,
    ``,
    `Result: ${resultLabel}`,
    `License Status: ${licenseStatus ?? 'N/A'}`,
    `License Class: ${licenseClass ?? 'N/A'}`,
    `Violations: ${violationsCount}`,
    `Accidents: ${accidentsCount}`,
    `Report ID: ${reportId}`,
  ].join('\n');

  await sendEmail({
    subject: 'Driver Check Complete',
    body: emailBody,
  }).catch(() => {});

  return NextResponse.json({ received: true });
}
