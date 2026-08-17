import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { BookingPageClient } from "@/app/book/[slug]/booking-page-client";
import { isPublicPageDisabled } from "@/lib/business-days";

interface Params {
  params: Promise<{ slug: string }>;
}

// Public page — must use admin client to bypass RLS since visitors are unauthenticated
export default async function DirectBookingLink({ params }: Params) {
  const { slug } = await params;
  const supabase = createAdminClient();

  // Find operator by booking_slug or referral_code
  // Also fetch white label branding fields (Scale plan only — applied client-side)
  // Fetch public_grace_deadline_at to evaluate Stage 2 public page cutoff.
  const { data: operator } = await supabase
    .from("operators")
    .select("id, business_name, logo_url, brand_color, brand_logo_url, brand_primary_color, brand_company_name, plan, public_grace_deadline_at")
    .or(`booking_slug.eq.${slug},referral_code.eq.${slug}`)
    .single();

  if (!operator) {
    notFound();
  }

  // Stage 2 grace period check: same logic as /book/[slug]/page.tsx
  // If 7 business days have passed since payment failure, show "unavailable" state.
  // Existing renter portals (/portal/[bookingId]) are unaffected.
  if (isPublicPageDisabled(operator.public_grace_deadline_at)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Booking Page Unavailable
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              This booking page is temporarily unavailable. If you have an existing booking,
              please contact the operator directly or check your confirmation email for details.
            </p>
          </div>
        </div>
      </div>
    );
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
