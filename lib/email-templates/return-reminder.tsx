/**
 * return-reminder.tsx
 *
 * Email template: "Your rental returns tomorrow"
 * Sent 24 hours before the scheduled return date.
 */

interface ReturnReminderData {
  renterName: string;
  vehicleLabel: string;
  returnDate: string;
  returnTime?: string | null;
  returnLocation?: string | null;
  operatorName: string;
  operatorPhone?: string | null;
  bookingId: string;
}

export function returnReminderHtml(data: ReturnReminderData): string {
  const {
    renterName,
    vehicleLabel,
    returnDate,
    returnTime,
    returnLocation,
    operatorName,
    operatorPhone,
    bookingId,
  } = data;

  return `
<p>Hi ${renterName},</p>
<p>This is a friendly reminder that your rental with <strong>${operatorName}</strong> is due back <strong>tomorrow</strong>.</p>

<table style="width:100%;border-collapse:collapse;margin:20px 0;border-radius:8px;overflow:hidden;">
  <tbody>
    <tr style="background:#fffbeb;">
      <td style="padding:12px 16px;font-weight:600;color:#92400e;width:40%;">Vehicle</td>
      <td style="padding:12px 16px;color:#111827;font-weight:600;">${vehicleLabel}</td>
    </tr>
    <tr>
      <td style="padding:12px 16px;font-weight:600;color:#374151;background:#f9fafb;">Return Date</td>
      <td style="padding:12px 16px;color:#111827;background:#f9fafb;"><strong>${returnDate}</strong>${returnTime ? ` at ${returnTime}` : ""}</td>
    </tr>
    ${
      returnLocation
        ? `<tr>
      <td style="padding:12px 16px;font-weight:600;color:#374151;">Return Location</td>
      <td style="padding:12px 16px;color:#111827;">${returnLocation}</td>
    </tr>`
        : ""
    }
  </tbody>
</table>

<h3 style="margin:24px 0 12px;font-size:15px;color:#111827;">What to Bring</h3>
<ul style="margin:0 0 20px;padding-left:20px;line-height:1.8;color:#374151;">
  <li>All keys and key fobs</li>
  <li>Vehicle in the same condition as pickup</li>
  <li>Any accessories that were provided with the rental</li>
</ul>

<div style="padding:16px;background:#fffbeb;border-radius:8px;border:1px solid #fcd34d;margin:20px 0;">
  <p style="margin:0 0 8px;font-weight:600;color:#92400e;">⚠️ Avoid Late Fees</p>
  <p style="margin:0;font-size:14px;color:#92400e;">
    If you need to extend your rental, please contact ${operatorName}${operatorPhone ? ` at <a href="tel:${operatorPhone}" style="color:#92400e;font-weight:600;">${operatorPhone}</a>` : ""} as soon as possible.
  </p>
</div>

<div style="margin:20px 0;padding:16px;background:#fafafa;border-radius:8px;border:1px solid #e5e7eb;">
  <p style="margin:0;font-size:13px;color:#6b7280;">
    📋 Booking reference: <strong>#${bookingId.slice(-8).toUpperCase()}</strong>
  </p>
</div>

<p>Thank you for being a valued customer!</p>
<p style="color:#6b7280;font-size:13px;">— The ${operatorName} Team</p>
`.trim();
}

export function returnReminderSubject(vehicleLabel: string): string {
  return `Your rental returns tomorrow — ${vehicleLabel}`;
}
