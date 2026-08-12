import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BookingPageClient } from "./booking-page-client";

interface Params {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Pick<Params, "params">): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: operator } = await supabase
    .from("operators")
    .select("business_name")
    .or(`booking_slug.eq.${slug},referral_code.eq.${slug}`)
    .single();

  const businessName = operator?.business_name ?? "PCR Booking";
  const title = `Book with ${businessName}`;
  const description = `Reserve a vehicle directly with ${businessName}. No platform fees — book instantly online.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

// Public page — must use admin client to bypass RLS since visitors are unauthenticated
export default async function PublicBookingPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = createAdminClient();

  // PCR Leads attribution: ?src=pcrleads or ?utm_source=pcrleads
  // Alton's ad campaigns tag links with either param.
  const srcParam = (sp.src as string | undefined) || (sp.utm_source as string | undefined) || null;
  const leadSource =
    srcParam && ["pcrleads", "pcr_leads", "pcr-leads"].includes(srcParam.toLowerCase())
      ? "pcr_leads"
      : "booking_widget";

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
      leadSource={leadSource}
    />
  );
}
