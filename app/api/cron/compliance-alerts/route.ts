/**
 * GET /api/cron/compliance-alerts
 *
 * Daily cron: checks vehicle_documents for upcoming expirations and sends
 * alert emails to operators at 30, 14, and 7 days before expiry.
 *
 * Security: requires Authorization: Bearer <CRON_SECRET> header
 * Schedule: 0 10 * * * (10:00 UTC daily, via vercel.json)
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/ghl";

const THRESHOLDS = [
  { days: 7, flag: "alert_sent_7" as const },
  { days: 14, flag: "alert_sent_14" as const },
  { days: 30, flag: "alert_sent_30" as const },
];

const DOC_LABELS: Record<string, string> = {
  insurance: "Insurance",
  registration: "Registration",
  state_inspection: "State Inspection",
  city_inspection: "City Inspection",
  tlc_inspection: "TLC Inspection",
  other: "Document",
};

function formatDocType(type: string, customName?: string | null): string {
  if (type === "other" && customName) return customName;
  return DOC_LABELS[type] ?? type;
}

function buildEmailBody(opts: {
  vehicleYear: number;
  vehicleMake: string;
  vehicleModel: string;
  vehiclePlate?: string | null;
  docLabel: string;
  expiryDate: string;
  daysUntil: number;
}): string {
  const { vehicleYear, vehicleMake, vehicleModel, vehiclePlate, docLabel, expiryDate, daysUntil } = opts;
  const vehicleDesc = `${vehicleYear} ${vehicleMake} ${vehicleModel}${vehiclePlate ? ` (${vehiclePlate})` : ""}`;
  const urgency = daysUntil <= 7 ? "URGENT" : daysUntil <= 14 ? "Important" : "Reminder";

  return `${urgency}: Your vehicle ${docLabel.toLowerCase()} is expiring soon.

Vehicle: ${vehicleDesc}
Document: ${docLabel}
Expiry Date: ${expiryDate}
Days Remaining: ${daysUntil} day${daysUntil === 1 ? "" : "s"}

Please renew this document immediately. Failure to maintain current documentation may result in:
• Vehicle impoundment
• Increased liability exposure
• Regulatory violations and fines
• Suspension of rental operations

Log in to your PCR Booking dashboard to upload the renewed document once complete.

<a href="https://pcrbooking.com/dashboard/fleet">Update Vehicle Documents →</a>

If you've already renewed this document, please upload the new certificate to your dashboard to clear this alert.

– PCR Booking Compliance System`;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date();
  const maxWindow = new Date(today);
  maxWindow.setDate(today.getDate() + 30);

  const todayStr = today.toISOString().split("T")[0];
  const maxWindowStr = maxWindow.toISOString().split("T")[0];

  // Fetch all documents expiring within 30 days that need at least one alert
  const { data: docs, error } = await supabase
    .from("vehicle_documents")
    .select(`
      id,
      document_type,
      document_name,
      expiry_date,
      alert_sent_30,
      alert_sent_14,
      alert_sent_7,
      operator_id,
      vehicle_id,
      vehicles (
        year,
        make,
        model,
        plate
      ),
      operators (
        ghl_contact_id,
        owner_name
      )
    `)
    .gte("expiry_date", todayStr)
    .lte("expiry_date", maxWindowStr)
    .or("alert_sent_7.eq.false,alert_sent_14.eq.false,alert_sent_30.eq.false");

  if (error) {
    console.error("[compliance-alerts] Failed to fetch documents:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of docs ?? []) {
    const operator = doc.operators as { ghl_contact_id?: string; owner_name?: string } | null;
    const vehicle = doc.vehicles as { year: number; make: string; model: string; plate?: string } | null;

    if (!operator?.ghl_contact_id || !vehicle) {
      skipped++;
      continue;
    }

    const expiryDate = new Date(doc.expiry_date + "T00:00:00");
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntil = Math.ceil((expiryDate.getTime() - today.getTime()) / msPerDay);

    const docLabel = formatDocType(doc.document_type, doc.document_name);
    const vehicleDesc = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

    // Determine which thresholds to fire (most urgent first)
    const flagsToSet: Partial<Record<"alert_sent_7" | "alert_sent_14" | "alert_sent_30", boolean>> = {};

    for (const threshold of THRESHOLDS) {
      if (daysUntil <= threshold.days && !doc[threshold.flag]) {
        const subject = `ACTION REQUIRED: ${vehicleDesc} ${docLabel} expires in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`;
        const body = buildEmailBody({
          vehicleYear: vehicle.year,
          vehicleMake: vehicle.make,
          vehicleModel: vehicle.model,
          vehiclePlate: vehicle.plate,
          docLabel,
          expiryDate: doc.expiry_date,
          daysUntil,
        });

        const ok = await sendEmail(operator.ghl_contact_id, {
          subject,
          body,
          fromName: "PCR Booking",
          fromEmail: "compliance@pcrbooking.com",
        });

        if (ok) {
          flagsToSet[threshold.flag] = true;
          sent++;
          console.log(
            `[compliance-alerts] ${threshold.days}d alert sent for doc ${doc.id} (${vehicleDesc} ${docLabel})`
          );
        } else {
          errors++;
          console.error(
            `[compliance-alerts] ${threshold.days}d alert FAILED for doc ${doc.id}`
          );
        }
        // Only send one email per doc per run (the most urgent threshold)
        break;
      }
    }

    if (Object.keys(flagsToSet).length > 0) {
      const { error: updateError } = await supabase
        .from("vehicle_documents")
        .update(flagsToSet)
        .eq("id", doc.id);

      if (updateError) {
        console.error(`[compliance-alerts] Failed to update flags for doc ${doc.id}:`, updateError);
      }
    } else {
      skipped++;
    }
  }

  console.log(`[compliance-alerts] Done. sent=${sent} skipped=${skipped} errors=${errors}`);
  return NextResponse.json({ ok: true, sent, skipped, errors, total: docs?.length ?? 0 });
}
