/**
 * review-request.tsx
 *
 * Email template: "How was your experience?"
 * Sent 24 hours after the return date.
 */

interface ReviewRequestData {
  renterName: string;
  vehicleLabel: string;
  operatorName: string;
  returnDate: string;
  bookingId: string;
  reviewUrl?: string | null;
}

export function reviewRequestHtml(data: ReviewRequestData): string {
  const {
    renterName,
    vehicleLabel,
    operatorName,
    returnDate,
    bookingId,
    reviewUrl,
  } = data;

  const stars = "⭐⭐⭐⭐⭐";

  return `
<p>Hi ${renterName},</p>
<p>Thank you for renting the <strong>${vehicleLabel}</strong> with <strong>${operatorName}</strong>! We hope you had a great experience.</p>

<div style="text-align:center;margin:32px 0;">
  <p style="font-size:40px;margin:0 0 8px;">${stars}</p>
  <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">How was your experience?</h2>
  <p style="margin:0 0 20px;color:#6b7280;font-size:15px;">Your feedback helps us improve and helps other renters make informed decisions.</p>
  ${
    reviewUrl
      ? `<a href="${reviewUrl}" style="display:inline-block;background:#2EBD6B;color:#ffffff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">Leave a Review</a>`
      : `<p style="display:inline-block;background:#2EBD6B;color:#ffffff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;margin:0;">Leave a Review</p>`
  }
</div>

<div style="padding:20px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0;margin:24px 0;">
  <h3 style="margin:0 0 12px;font-size:14px;color:#166534;">Your Rental Summary</h3>
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:4px 0;color:#374151;font-size:14px;width:40%;">Vehicle</td>
      <td style="padding:4px 0;color:#111827;font-size:14px;font-weight:500;">${vehicleLabel}</td>
    </tr>
    <tr>
      <td style="padding:4px 0;color:#374151;font-size:14px;">Returned</td>
      <td style="padding:4px 0;color:#111827;font-size:14px;font-weight:500;">${returnDate}</td>
    </tr>
    <tr>
      <td style="padding:4px 0;color:#374151;font-size:14px;">Company</td>
      <td style="padding:4px 0;color:#111827;font-size:14px;font-weight:500;">${operatorName}</td>
    </tr>
  </table>
</div>

<p style="font-size:14px;color:#6b7280;">
  Booking reference: #${bookingId.slice(-8).toUpperCase()}
</p>

<p>Thank you again for your business — we hope to see you again soon!</p>

<p style="color:#6b7280;font-size:13px;">— The ${operatorName} Team</p>
`.trim();
}

export function reviewRequestSubject(operatorName: string): string {
  return `How was your experience with ${operatorName}?`;
}
