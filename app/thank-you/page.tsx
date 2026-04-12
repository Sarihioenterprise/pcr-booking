"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

const PLAN_LABELS: Record<string, string> = {
  growth: "Growth",
  pro: "Pro",
  scale: "Scale",
};

const PLAN_VALUES: Record<string, Record<string, number>> = {
  growth: { monthly: 79, annual: 790 },
  pro: { monthly: 149, annual: 1490 },
  scale: { monthly: 249, annual: 2490 },
};

function ThankYouContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "growth";
  const billing = searchParams.get("billing") || "monthly";
  const valueParam = searchParams.get("value");

  const planLabel = PLAN_LABELS[plan] || plan;
  const billingLabel = billing === "annual" ? "Annual" : "Monthly";
  const value = valueParam
    ? Number(valueParam)
    : (PLAN_VALUES[plan]?.[billing] ?? 79);

  useEffect(() => {
    // Fire Meta Pixel Purchase event
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Purchase", {
        value,
        currency: "USD",
        content_name: `${planLabel} ${billingLabel}`,
      });
    }

    // Fire Google Ads conversion event
    if (typeof window !== "undefined" && window.gtag) {
      const conversionId = process.env.NEXT_PUBLIC_GADS_CONVERSION_ID || "AW-CONVERSION_ID";
      const conversionLabel = process.env.NEXT_PUBLIC_GADS_CONVERSION_LABEL || "CONVERSION_LABEL";
      window.gtag("event", "conversion", {
        send_to: `${conversionId}/${conversionLabel}`,
        value,
        currency: "USD",
        transaction_id: "",
      });

      // Fire GA4 purchase event
      const ga4Id = process.env.NEXT_PUBLIC_GA4_ID;
      if (ga4Id) {
        window.gtag("event", "purchase", {
          transaction_id: Date.now().toString(),
          value,
          currency: "USD",
          items: [
            {
              item_id: plan,
              item_name: `${planLabel} ${billingLabel}`,
              price: value,
              quantity: 1,
            },
          ],
        });
      }
    }
  }, [plan, billing, value, planLabel, billingLabel]);

  return (
    <div className="min-h-screen bg-[#0c0c1c] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2EBD6B]/10 ring-2 ring-[#2EBD6B]">
            <CheckCircle className="h-10 w-10 text-[#2EBD6B]" />
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
          You&apos;re in! 🎉
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          Welcome to PCR Booking. Your account is ready.
        </p>

        {/* Plan summary card */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 mb-8 text-left">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400 uppercase tracking-widest font-semibold">
              Your Plan
            </span>
            <span className="inline-flex items-center rounded-full bg-[#2EBD6B]/10 px-3 py-1 text-xs font-semibold text-[#2EBD6B] ring-1 ring-[#2EBD6B]/30">
              Active
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-white">
                {planLabel}
                <span className="text-base font-normal text-gray-400 ml-2">
                  {billingLabel}
                </span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {billing === "annual" ? "Billed annually · 2 months free" : "Billed monthly"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold text-white">
                ${value.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                {billing === "annual" ? "/ year" : "/ month"}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Link href="/dashboard">
          <Button className="w-full h-12 bg-[#2EBD6B] text-white hover:bg-[#1a9952] text-base font-semibold rounded-xl">
            Go to Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>

        <p className="mt-6 text-sm text-gray-500">
          A confirmation email is on its way. Need help?{" "}
          <a href="mailto:support@pcrbooking.com" className="text-[#2EBD6B] hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0c0c1c] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2EBD6B] border-t-transparent" />
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
