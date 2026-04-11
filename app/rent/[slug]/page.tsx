import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { BookingPageClient } from "@/app/book/[slug]/booking-page-client";

interface Params {
  params: Promise<{ slug: string }>;
}

export default async function DirectBookingLink({ params }: Params) {
  const { slug } = await params;
  const supabase = await createClient();

  // Find operator by booking_slug or referral_code
  // Also fetch white label branding fields (Scale plan only — applied client-side)
  const { data: operator } = await supabase
    .from("operators")
    .select("id, business_name, logo_url, brand_color, brand_logo_url, brand_primary_color, brand_company_name, plan")
    .or(`booking_slug.eq.${slug},referral_code.eq.${slug}`)
    .single();

  if (!operator) {
    notFound();
  }

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, make, model, year, daily_rate, weekly_rate, monthly_rate, category, photo_url, photos:vehicle_photos(url, is_primary)")
    .eq("operator_id", operator.id)
    .eq("status", "active")
    .order("daily_rate", { ascending: true });

  return (
    <BookingPageClient
      operator={operator}
      vehicles={vehicles ?? []}
      slug={slug}
    />
  );
}
