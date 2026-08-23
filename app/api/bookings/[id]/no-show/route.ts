import { NextRequest, NextResponse } from "next/server";
import { getOperator } from "@/lib/get-operator";
import { createAdminClient } from "@/lib/supabase/admin";
import twilio from "twilio";

// POST /api/bookings/[id]/no-show
// Operator-only (requires getOperator() auth)
// Body: { reason?: string, send_sms_first?: boolean }
// Marks booking as no-show, optionally sends SMS reminder first.
// Returns: { success: true, sms_sent: boolean }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const operator = await getOperator();
    const supabase = createAdminClient();
    const body = await request.json().catch(() => ({}));

    const reason: string | null = body.reason?.trim() || null;
    const sendSmsFirst: boolean = body.send_sms_first === true;

    // 1. Fetch booking (verify it belongs to this operator)
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, operator_id, status, renter_name, renter_phone, renter_id, start_date, is_no_show")
      .eq("id", id)
      .eq("operator_id", operator.id)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // 2. Validate current status (can't no-show an active or completed rental)
    const allowedStatuses = ["pending", "confirmed", "inquiry"];
    if (!allowedStatuses.includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot mark a ${booking.status} booking as no-show. Only pending or confirmed bookings can be marked.` },
        { status: 400 }
      );
    }

    if (booking.is_no_show) {
      return NextResponse.json({ error: "Booking is already marked as no-show" }, { status: 400 });
    }

    // 3. Optionally send SMS reminder first
    let smsSent = false;
    if (sendSmsFirst && booking.renter_phone) {
      try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER;

        if (accountSid && authToken && fromNumber) {
          const client = twilio(accountSid, authToken);
          await client.messages.create({
            body: `Hi ${booking.renter_name}, this is a reminder that your rental with ${operator.business_name} was scheduled for today. Please contact us if you still need the vehicle. Reply STOP to unsubscribe.`,
            from: fromNumber,
            to: booking.renter_phone,
          });
          smsSent = true;
        } else {
          // Twilio not fully configured — log and continue
          console.log("[No-Show SMS] Twilio not configured — skipping SMS");
        }
      } catch (smsErr) {
        console.error("[No-Show SMS] Failed to send:", smsErr);
        // Non-fatal — still mark as no-show
      }
    }

    // 4. Update booking: is_no_show=true, no_show_at=now, status=cancelled
    const { error: updateErr } = await supabase
      .from("bookings")
      .update({
        is_no_show: true,
        no_show_at: new Date().toISOString(),
        no_show_reason: reason,
        no_show_sms_sent: smsSent,
        status: "cancelled",
      })
      .eq("id", id)
      .eq("operator_id", operator.id);

    if (updateErr) {
      // Graceful handling: if the is_no_show column doesn't exist yet (migration not applied),
      // fall back to just cancelling with a note
      if (updateErr.code === "42703" || updateErr.message?.includes("is_no_show")) {
        await supabase
          .from("bookings")
          .update({
            status: "cancelled",
            notes: `[No-Show] ${reason || "Customer did not arrive"}`,
          })
          .eq("id", id)
          .eq("operator_id", operator.id);

        return NextResponse.json({
          success: true,
          sms_sent: smsSent,
          warning: "No-show columns not yet in DB — apply migration 028_no_show.sql. Status set to cancelled.",
        });
      }
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 5. Log to renter_communications if renter_id exists
    if (booking.renter_id) {
      await supabase
        .from("renter_communications")
        .insert({
          renter_id: booking.renter_id,
          operator_id: operator.id,
          type: "note",
          subject: "No Show",
          content: `Booking ${id.slice(0, 8)} marked as no-show.${reason ? ` Reason: ${reason}` : ""}${smsSent ? " SMS reminder was sent." : ""}`,
        })
        .throwOnError()
        .then(() => null)
        .then(null, (e: unknown) => {
          // renter_communications table may not exist — non-fatal
          console.warn("[No-Show] Could not log renter communication:", e);
        });
    }

    return NextResponse.json({ success: true, sms_sent: smsSent });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
