import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";
import { notFound } from "next/navigation";
import { PrintButton } from "./PrintButton";

function fmt(cents: number) {
  return `$${Number(cents).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(ymd: string) {
  return new Date(ymd + "T00:00:00").toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const operator = await getOperator();
  const supabase = createAdminClient();

  // Admin client bypasses RLS; auth gate is enforced by getOperator() above.
  // operator.business_name is used in the invoice header.
  // Note: bookings has no FK to renters table; use renter_email/renter_phone columns directly.
  const [{ data: booking, error }, { data: scheduleRows }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, vehicles(year, make, model)")
      .eq("id", id)
      .single(),
    supabase
      .from("payment_schedule")
      .select("amount, paid_at, status")
      .eq("booking_id", id)
      .in("status", ["paid", "refunded"]),
  ]);

  if (error || !booking) notFound();
  const amountPaid = (scheduleRows || [])
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const amountRefunded = (scheduleRows || [])
    .filter((r) => r.status === "refunded")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const vehicle = booking.vehicles as { year: number; make: string; model: string } | null;
  const vehicleLabel = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    : "Vehicle Rental";
  const startFmt = fmtDate(booking.start_date);
  const endFmt = fmtDate(booking.end_date);
  const invoiceNum = booking.id.slice(0, 8).toUpperCase();
  const invoiceDate = new Date(booking.created_at).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const baseRental =
    booking.total_price
    - (booking.tax_amount || 0)
    + (booking.discount_amount || 0);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-content, #invoice-content * { visibility: visible; }
          #invoice-content { position: absolute; left: 0; top: 0; width: 100%; border: none !important; border-radius: 0 !important; }
        }
      `}</style>

      <PrintButton />

      {/* Invoice content */}
      <div
        id="invoice-content"
        style={{
          fontFamily: "Georgia, serif",
          color: "#1a1a1a",
          background: "#fff",
          padding: "48px",
          maxWidth: "760px",
          margin: "0 auto",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h1 style={{ fontSize: 36, fontWeight: "bold", letterSpacing: 2, color: "#111", margin: 0 }}>INVOICE</h1>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: "bold", color: "#333" }}>#{invoiceNum}</div>
            <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Date: {invoiceDate}</div>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid #ddd", margin: "24px 0" }} />

        {/* From / Bill To */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>From</div>
            <div style={{ fontSize: 15, fontWeight: "bold", marginBottom: 4 }}>{operator.business_name || "Your Rental Company"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Bill To</div>
            <div style={{ fontSize: 15, fontWeight: "bold", marginBottom: 4 }}>{booking.renter_name}</div>
            {booking.renter_email && <div style={{ fontSize: 13, color: "#555", marginBottom: 2 }}>{booking.renter_email}</div>}
            {booking.renter_phone && <div style={{ fontSize: 13, color: "#555", marginBottom: 2 }}>{booking.renter_phone}</div>}
          </div>
        </div>

        {/* Line items */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 24 }}>
          <thead>
            <tr>
              {["Description", "Qty", "Rate", "Amount"].map((h, i) => (
                <th key={h} style={{
                  fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 1,
                  padding: "8px 0", borderBottom: "1px solid #ccc",
                  textAlign: i === 0 ? "left" : "right",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "14px 0", fontSize: 13, borderBottom: "1px solid #eee" }}>
                <div>{vehicleLabel}</div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 3 }}>{startFmt} – {endFmt}</div>
              </td>
              <td style={{ padding: "14px 0", fontSize: 13, borderBottom: "1px solid #eee", textAlign: "right" }}>{booking.duration_days}</td>
              <td style={{ padding: "14px 0", fontSize: 13, borderBottom: "1px solid #eee", textAlign: "right" }}>{fmt(booking.daily_rate)}</td>
              <td style={{ padding: "14px 0", fontSize: 13, borderBottom: "1px solid #eee", textAlign: "right" }}>{fmt(baseRental)}</td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ marginTop: 16 }}>
          {(booking.discount_amount || 0) > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 60, padding: "6px 0", fontSize: 13 }}>
              <span>Discount</span><span>-{fmt(booking.discount_amount)}</span>
            </div>
          )}
          {(booking.tax_amount || 0) > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 60, padding: "6px 0", fontSize: 13 }}>
              <span>Tax</span><span>{fmt(booking.tax_amount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 60, padding: "12px 0 6px", fontSize: 15, fontWeight: "bold", borderTop: "2px solid #111", marginTop: 4 }}>
            <span>Total</span><span>{fmt(booking.total_price)}</span>
          </div>
          {(amountPaid > 0 || amountRefunded > 0) && (
            <>
              {amountPaid > 0 && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 60, padding: "6px 0", fontSize: 13, color: "#16a34a" }}>
                  <span>Amount Paid</span><span>-{fmt(amountPaid)}</span>
                </div>
              )}
              {amountRefunded > 0 && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 60, padding: "6px 0", fontSize: 13, color: "#2563eb" }}>
                  <span>Refunded</span><span>+{fmt(amountRefunded)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 60, padding: "6px 0", fontSize: 14, fontWeight: "bold", borderTop: "1px solid #ddd", marginTop: 2 }}>
                <span>Balance Due</span><span>{fmt(Math.max(0, booking.total_price - amountPaid))}</span>
              </div>
            </>
          )}
          {(booking.deposit_amount || 0) > 0 && (
            <div style={{ fontSize: 12, color: "#888", marginTop: 8, textAlign: "right" }}>
              Security Deposit: {fmt(booking.deposit_amount)} ({booking.deposit_status || "pending"})
            </div>
          )}
        </div>

        <div style={{ marginTop: 60, textAlign: "center", fontSize: 12, color: "#aaa", fontStyle: "italic" }}>
          Thank you for your business.
        </div>
      </div>
    </>
  );
}
