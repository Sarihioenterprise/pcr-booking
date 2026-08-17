/**
 * Business day utilities.
 * Business days = Monday–Friday, excluding weekends.
 * Holidays are NOT excluded (no specific list provided by owner).
 */

/**
 * Given a start date, returns a new Date that is `days` business days in the future.
 * The start date itself is NOT counted — counting begins the next day.
 *
 * Examples:
 *   addBusinessDays(Thursday Aug 14, 7) → Monday Aug 25
 *   addBusinessDays(Friday Aug 15, 7)   → Tuesday Aug 26
 *   addBusinessDays(Monday Aug 11, 7)   → Wednesday Aug 20
 *   addBusinessDays(Saturday Aug 16, 7) → Monday Aug 25 (Sat → treat as next Mon start)
 *
 * @param from  Starting date (typically the payment-failure timestamp)
 * @param days  Number of business days to add (must be positive)
 */
export function addBusinessDays(from: Date, days: number): Date {
  if (days <= 0) throw new Error("days must be positive");

  const result = new Date(from);
  let added = 0;

  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay(); // 0=Sun, 6=Sat
    if (dow !== 0 && dow !== 6) {
      added++;
    }
  }

  return result;
}

/**
 * Returns true if the public booking page should be disabled right now,
 * based on the stored deadline.
 *
 * @param deadlineAt  Value of operators.public_grace_deadline_at (ISO string or Date or null)
 */
export function isPublicPageDisabled(deadlineAt: string | Date | null | undefined): boolean {
  if (!deadlineAt) return false;
  const deadline = deadlineAt instanceof Date ? deadlineAt : new Date(deadlineAt);
  return Date.now() > deadline.getTime();
}
