/**
 * resolveOperatorEmail
 *
 * Returns the best available notification email for an operator:
 *   1. business_email if set (explicit notification address)
 *   2. Falls back to the operator's auth account email (user_id → auth.users)
 *
 * This ensures operators who signed up before the business_email field existed
 * (or who skipped it during onboarding) still receive every notification.
 *
 * Usage: import { resolveOperatorEmail } from "@/lib/notify-email";
 *        const email = await resolveOperatorEmail({ business_email, user_id });
 */
import { createAdminClient } from "@/lib/supabase/admin";

interface OperatorEmailFields {
  business_email?: string | null;
  user_id?: string | null;
}

export async function resolveOperatorEmail(
  operator: OperatorEmailFields
): Promise<string | null> {
  // Fast path — explicit notification address configured
  if (operator.business_email) return operator.business_email;

  // Fallback — look up the auth account email via service role
  if (!operator.user_id) return null;
  try {
    const admin = createAdminClient();
    const {
      data: { user },
      error,
    } = await admin.auth.admin.getUserById(operator.user_id);
    if (error || !user?.email) return null;
    return user.email;
  } catch {
    return null;
  }
}
