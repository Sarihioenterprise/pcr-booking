/**
 * booking-confirmation.tsx
 *
 * Email template: "Your booking is confirmed!"
 * Sent immediately when a booking is created/confirmed.
 */

interface BookingConfirmationData {
  renterName: string;
  vehicleLabel: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  totalPaid: number;
  pickupLocation?: string | null;
  pickupTime?: string | null;
  returnTime?: string | null;
  operatorName: string;
  operatorPhone?: string | null;
  operatorEmail?: string | null;
  bookingId: string;
  baseUrl: string;
}

export function bookingConfirmationHtml(data: BookingConfirmationData): string {
  const {
    renterName,
    vehicleLabel,
    startDate,
    endDate,
    durationDays,
    totalPaid,
    pickupLocation,
    pickupTime,
    returnTime,
    operatorName,
    operatorPhone,
    operatorEmail,
    bookingId,
    baseUrl,
  } = data;

  return `
<p>Hi ${renterName},</p>
<p>Great news — your rental booking is <strong>confirmed</strong>! Here are your rental details:</p>

<table style="width:100%;border-collapse:collapse;margin:20px 0;border-radius:8px;overflow:hidden;">
  <tbody>
    <tr style="background:#f0fdf4;">
      <td style="padding:12px 16px;font-weight:600;color:#166534;width:40%;">Vehicle</td>
      <td style="padding:12px 16px;color:#111827;">${vehicleLabel}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-weight:600;color:#374151;background:#f9fafb;">Pickup Date</td>
      <td style="padding:12px 16px;color:#111827;background:#f9fafb;">${startDate}${pickupTime ? ` at ${pickupTime}` : ""}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-weight:600;color:#374151;">Return Date</td>
      <td style="padding:12px 16px;color:#111827;">${endDate}${returnTime ? ` at ${returnTime}` : ""}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-weight:600;color:#374151;background:#f9fafb;">Duration</td>
      <td style="padding:12px 16px;color:#111827;background:#f9fafb;">${durationDays} day${durationDays !== 1 ? "s" : ""}</td>
    </tr>
    ${
      pickupLocation
        ? `<tr>
      <td style="padding:12px 16px;font-weight:600;color:#374151;">Pickup Location</td>
      <td style="padding:12px 16px;color:#111827;">${pickupLocation}</td>
    </tr>`
        : ""
    }
    <tr>
      <td style="padding:12px 16px;font-weight:600;color:#166534;background:#f0fdf4;">Total Paid</td>
      <td style="padding:12px 16px;font-weight:700;color:#166534;font-size:18px;background:#f0fdf4;">$${totalPaid.toFixed(2)}</td>
    </tr>
  </tbody>
</table>

<h3 style="margin:24px 0 8px;font-size:15px;color:#111827;">Operator Contact</h3>
<table style="width:100%;border-collapse:collapse;">
  <tbody>
    <tr>
      <td style="padding:8px 16px;font-weight:600;color:#374151;width:40%;">Company</td>
      <td style="padding:8px 16px;color:#111827;">${operatorName}</td>
    </tr>
    ${
      operatorPhone
        ? `<tr>
      <td style="padding:8px 16px;font-weight:600;color:#374151;">Phone</td>
      <td style="padding:8px 16px;color:#111827;"><a href="tel:${operatorPhone}" style="color:#2EBD6B;">${operatorPhone}</a></td>
    </tr>`
        : ""
    }
    ${
      operatorEmail
        ? `<tr>
      <td style="padding:8px 16px;font-weight:600;color:#374151;">Email</td>
      <td style="padding:8px 16px;color:#111827;"><a href="mailto:${operatorEmail}" style="color:#2EBD6B;">${operatorEmail}</a></td>
    </tr>`
        : ""
    }
  </tbody>
</table>

<div style="margin:28px 0 8px;padding:16px;background:#fafafa;border-radius:8px;border:1px solid #e5e7eb;">
  <p style="margin:0;font-size:13px;color:#6b7280;">
    📋 Booking reference: <strong>#${bookingId.slice(-8).toUpperCase()}</strong>
  </p>
</div>

<p style="margin-top:24px;">If you have any questions or need to make changes to your booking, please contact <strong>${operatorName}</strong> directly using the contact information above.</p>

<p>Thank you for your reservation. We look forward to serving you!</p>

<p style="color:#6b7280;font-size:13px;">— The ${operatorName} Team</p>
`.trim();
}

export function bookingConfirmationSubject(vehicleLabel: string): string {
  return `Your booking is confirmed! — ${vehicleLabel}`;
}
