import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Find-or-create a renter for an operator, matched on email or phone.
 *
 * This is the single source of truth for renter identity. Every path that
 * creates a booking (dashboard form, public booking widget, lead conversion)
 * MUST route through this so that bookings.renter_id always points at the
 * SAME renter row for a given person.
 *
 * Background: the public booking flow used to insert a renter without ever
 * linking it, and lead conversion blindly inserted a second renter. The
 * result was duplicate renter rows where the original (holding the uploaded
 * driver's license) showed "0 total bookings" forever, because the Renters
 * page derives that count live from bookings.renter_id.
 */
export async function upsertRenter(
  supabase: SupabaseClient,
  params: {
    operatorId: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    driversLicenseNumber?: string | null;
    driversLicenseUrl?: string | null;
  }
): Promise<string | null> {
  const {
    operatorId,
    name,
    email,
    phone,
    city,
    driversLicenseNumber,
    driversLicenseUrl,
  } = params;

  if (!operatorId || !name) return null;

  const orParts = [
    email ? `email.eq.${email}` : null,
    phone ? `phone.eq.${phone}` : null,
  ].filter(Boolean) as string[];

  let renterId: string | null = null;

  if (orParts.length > 0) {
    // NOTE: deliberately NOT .maybeSingle() — historical duplicates exist from
    // the old broken flows, and maybeSingle() errors when >1 row matches.
    // Take the oldest match so we converge on the original renter record.
    const { data: existing } = await supabase
      .from("renters")
      .select("id")
      .eq("operator_id", operatorId)
      .or(orParts.join(","))
      .order("created_at", { ascending: true })
      .limit(1);

    if (existing && existing.length > 0) {
      renterId = existing[0].id;
    }
  }

  if (renterId) {
    // Backfill any newly supplied detail without clobbering existing values.
    const patch: Record<string, unknown> = {};
    if (email) patch.email = email;
    if (phone) patch.phone = phone;
    if (city) patch.city = city;
    if (driversLicenseNumber) patch.drivers_license_number = driversLicenseNumber;
    if (driversLicenseUrl) patch.drivers_license_url = driversLicenseUrl;

    if (Object.keys(patch).length > 0) {
      await supabase.from("renters").update(patch).eq("id", renterId);
    }

    return renterId;
  }

  const insert: Record<string, unknown> = {
    operator_id: operatorId,
    name,
    email: email || null,
    phone: phone || null,
  };
  if (city) insert.city = city;
  if (driversLicenseNumber) insert.drivers_license_number = driversLicenseNumber;
  if (driversLicenseUrl) insert.drivers_license_url = driversLicenseUrl;

  const { data: created, error } = await supabase
    .from("renters")
    .insert(insert)
    .select("id")
    .single();

  if (error || !created) return null;
  return created.id;
}
