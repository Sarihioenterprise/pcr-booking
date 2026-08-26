/**
 * GET /api/cron/health-check
 *
 * Daily health check at 8 AM UTC. Fixes data inconsistencies:
 * - Expired trials not marked as such
 * - Nurture rows that should be stopped
 * - Nurture rows missing GHL contact IDs
 *
 * Logs fixes to health_check_log and notifies Alton on Telegram if anything changed.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAlton } from "@/lib/telegram";
import { upsertContact } from "@/lib/ghl";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startMs = Date.now();
  const supabase = createAdminClient();
  const now = new Date();
  const fixes: string[] = [];

  // 1. Find trialing subscriptions where trial_end is in the past
  const { data: expiredTrials } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("status", "trialing")
    .lt("trial_end", now.toISOString());

  for (const sub of expiredTrials ?? []) {
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "past_due", updated_at: now.toISOString() })
      .eq("stripe_subscription_id", sub.stripe_subscription_id);

    if (!error) {
      fixes.push(`Marked expired trial as past_due: ${sub.stripe_subscription_id}`);
    }
  }

  // 2. Stop nurture for users whose subscription is now active or canceled
  const { data: activeNurture } = await supabase
    .from("pcr_booking_nurture")
    .select("id, email")
    .is("stopped_at", null);

  for (const row of activeNurture ?? []) {
    // Find the operator by email
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const matchedUser = authUsers?.users?.find((u) => u.email === row.email);
    if (!matchedUser) continue;

    const { data: operator } = await supabase
      .from("operators")
      .select("stripe_subscription_id, plan")
      .eq("user_id", matchedUser.id)
      .single();

    if (!operator) continue;

    // If they have an active subscription (paid) or explicitly canceled, stop nurture
    if (operator.stripe_subscription_id) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("stripe_subscription_id", operator.stripe_subscription_id)
        .single();

      if (sub?.status === "active" || sub?.status === "canceled") {
        await supabase
          .from("pcr_booking_nurture")
          .update({ stopped_at: now.toISOString() })
          .eq("id", row.id);

        fixes.push(`Stopped nurture for ${row.email} (sub status: ${sub.status})`);
      }
    }
  }

  // 3. Try to create GHL contacts for nurture rows missing them
  const { data: missingGHL } = await supabase
    .from("pcr_booking_nurture")
    .select("id, email, first_name")
    .is("ghl_contact_id", null)
    .is("stopped_at", null);

  for (const row of missingGHL ?? []) {
    try {
      const contact = await upsertContact({
        email: row.email,
        firstName: row.first_name ?? undefined,
      });

      if (contact?.id) {
        await supabase
          .from("pcr_booking_nurture")
          .update({ ghl_contact_id: contact.id })
          .eq("id", row.id);

        fixes.push(`Created GHL contact for nurture row: ${row.email}`);
      }
    } catch (err) {
      console.error(`[health-check] GHL upsert failed for ${row.email}:`, err);
    }
  }

  const durationMs = Date.now() - startMs;

  // Log to DB
  await supabase.from("health_check_log").insert({
    run_at: now.toISOString(),
    fixes_applied: fixes,
    issues_found: fixes.length,
    duration_ms: durationMs,
  });

  // Telegram alert if anything was fixed
  if (fixes.length > 0) {
    const summary = fixes.map((f) => `• ${f}`).join("\n");
    await notifyAlton(
      `🔧 <b>PCR Booking Health Check</b>\n\n${fixes.length} fix(es) applied:\n${summary}\n\n⏱ ${durationMs}ms`
    );
  }

  console.log(`[health-check] Done. fixes=${fixes.length} duration=${durationMs}ms`);
  return NextResponse.json({ ok: true, fixes, durationMs });
}
