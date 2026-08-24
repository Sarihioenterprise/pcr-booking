import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { verifyRenterToken, RENTER_SESSION_COOKIE } from "@/lib/renter-portal-jwt";
import { createAdminClient } from "@/lib/supabase/admin";

interface Params {
  params: Promise<{ bookingId: string }>;
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtCurrency(amount: number | null | undefined) {
  if (amount == null) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default async function InvoicePage({ params }: Params) {
  const { bookingId } = await params;

  // Auth check
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(RENTER_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    redirect("/renter-portal/login");
  }

  const payload = await verifyRenterToken(sessionToken);
  if (!payload || payload.type !== "session") {
    redirect("/renter-portal/login?error=invalid_token");
  }

  const supabase = createAdminClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      id, status, start_date, end_date, daily_rate, total_price,
      tax_amount, discount_amount, addons_total, deposit_amount, deposit_status,
      duration_days, created_at, renter_name, renter_email, renter_phone,
      pickup_location, pickup_time, return_time,
      vehicles ( make, model, year, color, plate ),
      operators ( business_name, booking_slug )
    `)
    .eq("id", bookingId)
    .eq("renter_id", payload.sub)  // Security: only the renter's own bookings
    .single();

  if (!booking) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = (Array.isArray(booking.vehicles) ? booking.vehicles[0] : booking.vehicles) as { make: string; model: string; year: number; color: string | null; plate: string | null } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const op = (Array.isArray(booking.operators) ? booking.operators[0] : booking.operators) as { business_name: string; booking_slug: string } | null;
  const vehicleName = v ? `${v.year} ${v.make} ${v.model}` : "Vehicle";
  const invoiceNumber = `INV-${booking.id.slice(0, 8).toUpperCase()}`;

  const subtotal = (booking.daily_rate ?? 0) * (booking.duration_days ?? 0);
  const addons = booking.addons_total ?? 0;
  const tax = booking.tax_amount ?? 0;
  const discount = booking.discount_amount ?? 0;
  const total = booking.total_price ?? subtotal + addons + tax - discount;

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Invoice {invoiceNumber}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            color: #111;
            background: #fff;
            padding: 40px 32px;
            max-width: 680px;
            margin: 0 auto;
          }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
          .company-name { font-size: 22px; font-weight: 700; color: #111; }
          .company-sub { font-size: 12px; color: #888; margin-top: 4px; }
          .invoice-meta { text-align: right; }
          .invoice-num { font-size: 18px; font-weight: 700; color: #2EBD6B; }
          .invoice-date { font-size: 12px; color: #888; margin-top: 4px; }
          .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; padding: 24px; background: #f9fafb; border-radius: 8px; }
          .party-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 8px; }
          .party-name { font-size: 15px; font-weight: 600; color: #111; margin-bottom: 4px; }
          .party-detail { font-size: 13px; color: #555; line-height: 1.5; }
          .vehicle-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px; display: flex; justify-content: space-between; align-items: center; }
          .vehicle-name { font-size: 16px; font-weight: 600; color: #111; }
          .vehicle-detail { font-size: 13px; color: #666; margin-top: 3px; }
          .dates { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 28px; }
          .date-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; }
          .date-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 4px; }
          .date-value { font-size: 14px; font-weight: 500; color: #111; }
          .line-items { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .line-items th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #888; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .line-items th:last-child, .line-items td:last-child { text-align: right; }
          .line-items td { padding: 10px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; color: #444; }
          .total-row td { font-size: 15px; font-weight: 700; color: #111; border-bottom: none; padding-top: 16px; }
          .discount-row td { color: #2EBD6B; }
          .status-badge {
            display: inline-flex; align-items: center;
            padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500;
            background: #dcfce7; color: #166534; text-transform: capitalize;
          }
          .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #aaa; text-align: center; }
          @media print {
            body { padding: 20px 24px; }
            .no-print { display: none !important; }
          }
        `}</style>
      </head>
      <body>
        {/* Print button */}
        <div className="no-print" style={{ marginBottom: "20px", textAlign: "right" }}>
          <button
            onClick={() => window.print()}
            style={{ padding: "8px 16px", background: "#2EBD6B", color: "#fff", border: "none", borderRadius: "6px", fontSize: "13px", cursor: "pointer", fontWeight: "500" }}
          >
            Print / Save PDF
          </button>
          <a href="/renter-portal/dashboard" style={{ marginLeft: "10px", fontSize: "13px", color: "#666", textDecoration: "none" }}>
            ← Back to Dashboard
          </a>
        </div>

        {/* Header */}
        <div className="header">
          <div>
            <div className="company-name">{op?.business_name ?? "PCR Booking"}</div>
            <div className="company-sub">Rental Invoice</div>
          </div>
          <div className="invoice-meta">
            <div className="invoice-num">{invoiceNumber}</div>
            <div className="invoice-date">Issued: {fmt(booking.created_at)}</div>
            <div style={{ marginTop: "8px" }}>
              <span className="status-badge">{booking.status}</span>
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="parties">
          <div>
            <div className="party-label">Rental Company</div>
            <div className="party-name">{op?.business_name ?? "Rental Operator"}</div>
            {op?.booking_slug && (
              <div className="party-detail">pcrbooking.com/book/{op.booking_slug}</div>
            )}
          </div>
          <div>
            <div className="party-label">Renter</div>
            <div className="party-name">{booking.renter_name}</div>
            <div className="party-detail">
              {booking.renter_email}
              {booking.renter_phone && <><br />{booking.renter_phone}</>}
            </div>
          </div>
        </div>

        {/* Vehicle */}
        <div className="vehicle-box">
          <div>
            <div className="vehicle-name">{vehicleName}</div>
            <div className="vehicle-detail">
              {[v?.color, v?.plate ? `Plate: ${v.plate}` : null].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "13px", color: "#888" }}>Daily Rate</div>
            <div style={{ fontSize: "18px", fontWeight: "600", color: "#111" }}>
              {fmtCurrency(booking.daily_rate)}
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="dates">
          <div className="date-box">
            <div className="date-label">Pickup</div>
            <div className="date-value">{fmt(booking.start_date)}</div>
            {booking.pickup_time && (
              <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>{booking.pickup_time}</div>
            )}
          </div>
          <div className="date-box">
            <div className="date-label">Return</div>
            <div className="date-value">{fmt(booking.end_date)}</div>
            {booking.return_time && (
              <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>{booking.return_time}</div>
            )}
          </div>
        </div>

        {booking.pickup_location && (
          <div style={{ fontSize: "13px", color: "#666", marginBottom: "28px", padding: "10px 14px", background: "#f9fafb", borderRadius: "6px" }}>
            📍 {booking.pickup_location}
          </div>
        )}

        {/* Line Items */}
        <table className="line-items">
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{vehicleName} rental</td>
              <td>{booking.duration_days} days</td>
              <td>{fmtCurrency(booking.daily_rate)}</td>
              <td>{fmtCurrency(subtotal)}</td>
            </tr>
            {addons > 0 && (
              <tr>
                <td>Add-ons & extras</td>
                <td>—</td>
                <td>—</td>
                <td>{fmtCurrency(addons)}</td>
              </tr>
            )}
            {tax > 0 && (
              <tr>
                <td>Tax</td>
                <td>—</td>
                <td>—</td>
                <td>{fmtCurrency(tax)}</td>
              </tr>
            )}
            {discount > 0 && (
              <tr className="discount-row">
                <td>Discount</td>
                <td>—</td>
                <td>—</td>
                <td>-{fmtCurrency(discount)}</td>
              </tr>
            )}
            {(booking.deposit_amount ?? 0) > 0 && (
              <tr>
                <td>Security deposit ({booking.deposit_status ?? "pending"})</td>
                <td>—</td>
                <td>—</td>
                <td>{fmtCurrency(booking.deposit_amount)}</td>
              </tr>
            )}
            <tr className="total-row">
              <td colSpan={3}>Total</td>
              <td>{fmtCurrency(total)}</td>
            </tr>
          </tbody>
        </table>

        <div className="footer">
          Invoice #{invoiceNumber} &mdash; Generated by PCR Booking &mdash; pcrbooking.com
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          document.querySelector('.no-print button')?.addEventListener('click', () => window.print());
        ` }} />
      </body>
    </html>
  );
}
