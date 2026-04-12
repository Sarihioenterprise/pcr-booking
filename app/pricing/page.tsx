"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Car,
  Check,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type PlanId = "free" | "growth" | "pro" | "scale";
type Billing = "monthly" | "annual";

const MONTHLY_PRICES: Record<string, number> = { growth: 79, pro: 149, scale: 249 };
const ANNUAL_PRICES: Record<string, number> = { growth: 790, pro: 1490, scale: 2490 };

interface PricingTier {
  id: PlanId;
  name: string;
  description: string;
  features: string[];
  highlighted: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    description: "Get started with the essentials",
    features: [
      "Up to 3 vehicles",
      "Booking widget",
      "Basic fleet management",
      "Email support",
      "Perfect for getting started",
    ],
    highlighted: false,
  },
  {
    id: "growth",
    name: "Growth",
    description: "For solo operators getting started",
    features: [
      "Up to 15 vehicles",
      "Booking widget",
      "Fleet management",
      "Lead tracking",
      "Email support",
    ],
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing rental businesses",
    features: [
      "Up to 40 vehicles",
      "Everything in Growth",
      "Multi-location support",
      "AI qualification bot",
      "Priority support",
      "Advanced analytics",
    ],
    highlighted: true,
  },
  {
    id: "scale",
    name: "Scale",
    description: "For established fleet operators",
    features: [
      "Unlimited vehicles",
      "Everything in Pro",
      "White-label branding",
      "API access",
      "Custom booking page branding",
      "Custom integrations",
    ],
    highlighted: false,
  },
];

const faqs = [
  {
    question: "Is there a free trial?",
    answer:
      "Yes. We offer a free forever plan with up to 3 vehicles. Paid plans include a 14-day free trial — no credit card required. Cancel anytime.",
  },
  {
    question: "Can I switch plans later?",
    answer:
      "Absolutely. You can upgrade or downgrade your plan at any time from your dashboard settings. Changes take effect on your next billing cycle.",
  },
  {
    question: "What happens if I exceed my vehicle limit?",
    answer:
      "You will be prompted to upgrade to the next plan. Your existing vehicles and bookings are never affected — we just prevent adding new vehicles beyond your limit.",
  },
  {
    question: "Do you take a percentage of my bookings?",
    answer:
      "Never. PCR Booking charges a flat monthly subscription fee. You keep 100% of every booking you receive through the platform.",
  },
  {
    question: "How does the affiliate program work?",
    answer:
      "Refer other rental operators using your unique link. When they subscribe, you earn 30% recurring commission on their payments for 12 months. There is no cap on how many operators you can refer.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. There are no long-term contracts. Cancel from your dashboard settings at any time and your subscription ends at the end of the current billing period.",
  },
];

function getPriceDisplay(tier: PricingTier, billing: Billing) {
  if (tier.id === "free") return { price: "$0", period: "forever", annualNote: null };
  const monthly = MONTHLY_PRICES[tier.id];
  const annual = ANNUAL_PRICES[tier.id];
  if (billing === "annual") {
    return {
      price: `$${annual.toLocaleString()}`,
      period: "/ year",
      annualNote: "2 months free",
    };
  }
  return {
    price: `$${monthly}`,
    period: "/ mo",
    annualNote: null,
  };
}

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [billing, setBilling] = useState<Billing>("monthly");

  async function handleStartTrial(plan: PlanId) {
    setCheckoutError(null);
    setLoadingPlan(plan);
    try {
      if (plan === "free") {
        window.location.href = "/auth/signup";
        return;
      }

      const res = await fetch("/api/billing/checkout-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start checkout");
      window.location.href = data.url;
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : "Something went wrong");
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2EBD6B]">
              <Car className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#080812]">
              PCR Booking
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link href="/#features" className="text-sm text-[#6B7280] transition-colors hover:text-[#374151]">
              Features
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-[#374151]">
              Pricing
            </Link>
            <Link href="/#affiliates" className="text-sm text-[#6B7280] transition-colors hover:text-[#374151]">
              Affiliates
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="hidden text-sm text-[#6B7280] transition-colors hover:text-[#374151] sm:block">
              Login
            </Link>
            <Button
              className="h-9 bg-[#2EBD6B] px-4 text-sm font-semibold text-white hover:bg-[#1a9952]"
              onClick={() => handleStartTrial("growth")}
              disabled={loadingPlan !== null}
            >
              Start Free Trial
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 pb-4 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#080812] sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[#6B7280]">
            No hidden fees. No per-booking commission. Just a flat monthly rate
            so you keep 100% of your revenue.
          </p>
        </div>
      </section>

      {/* Billing Toggle */}
      <section className="px-4 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-xs items-center justify-center">
          <div className="flex rounded-full bg-[#E5E7EB] p-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                billing === "monthly"
                  ? "bg-white text-[#080812] shadow-sm"
                  : "text-[#6B7280] hover:text-[#374151]"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                billing === "annual"
                  ? "bg-white text-[#080812] shadow-sm"
                  : "text-[#6B7280] hover:text-[#374151]"
              }`}
            >
              Annual
              <span className="rounded-full bg-[#2EBD6B] px-2 py-0.5 text-[10px] font-bold text-white">
                SAVE 17%
              </span>
            </button>
          </div>
        </div>
        {billing === "monthly" && (
          <p className="mt-3 text-center text-sm text-[#6B7280]">
            + $199 setup fee (waived on annual plans)
          </p>
        )}
      </section>

      {/* Pricing Cards */}
      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
          {pricingTiers.filter((t) => t.id !== "free").map((tier) => {
            const { price, period, annualNote } = getPriceDisplay(tier, billing);
            return (
              <Card
                key={tier.name}
                className={`flex flex-col bg-white shadow-sm ${
                  tier.highlighted
                    ? "ring-2 ring-[#2EBD6B] shadow-md"
                    : "ring-1 ring-[#E5E7EB]"
                }`}
              >
                <div className={tier.highlighted ? "relative -mt-6 mb-6" : ""}>
                  {tier.highlighted && (
                    <div className="flex justify-center">
                      <Badge className="bg-[#2EBD6B] text-white">Most Popular</Badge>
                    </div>
                  )}
                </div>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl text-[#080812]">{tier.name}</CardTitle>
                    {annualNote && (
                      <Badge className="bg-[#2EBD6B]/10 text-[#2EBD6B] border border-[#2EBD6B]/20">
                        {annualNote}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-[#6B7280]">{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <div className="mb-8">
                    <span className="text-5xl font-extrabold text-[#080812]">{price}</span>
                    <span className="text-lg text-[#6B7280] ml-1">{period}</span>
                  </div>
                  <ul className="flex flex-col gap-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-sm text-[#374151]">
                        <Check className="h-4 w-4 shrink-0 text-[#2EBD6B]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className={`w-full h-10 font-semibold ${
                      tier.highlighted
                        ? "bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                        : "bg-[#080812] text-white hover:bg-[#080812]/90"
                    }`}
                    disabled={loadingPlan !== null}
                    onClick={() => handleStartTrial(tier.id)}
                  >
                    {loadingPlan === tier.id ? "Redirecting..." : "Start Free Trial"}
                    {loadingPlan !== tier.id && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {checkoutError && (
          <p className="mt-4 text-center text-sm text-red-500">{checkoutError}</p>
        )}

        <p className="mt-8 text-center text-sm text-[#6B7280]">
          All paid plans include a 14-day free trial. No credit card required — cancel anytime.
        </p>
      </section>

      {/* FAQ */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-[#080812]">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-[#6B7280]">
            Everything you need to know about PCR Booking plans.
          </p>

          <div className="mt-12 flex flex-col gap-4">
            {faqs.map((faq) => (
              <Card key={faq.question} className="bg-white ring-1 ring-[#E5E7EB] shadow-sm">
                <CardContent className="py-1">
                  <h3 className="text-base font-semibold text-[#080812]">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-2xl bg-[#080812] px-6 py-12 text-center sm:px-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to take control of your bookings?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-gray-400">
            Join operators who are keeping 100% of their revenue. Start your free trial today.
          </p>
          <Button
            className="mt-6 h-11 bg-[#2EBD6B] px-6 text-base font-semibold text-white hover:bg-[#1a9952]"
            onClick={() => handleStartTrial("pro")}
            disabled={loadingPlan !== null}
          >
            {loadingPlan === "pro" ? "Redirecting..." : "Get Started Free"}
            {loadingPlan !== "pro" && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2EBD6B]">
                  <Car className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-[#080812]">PCR Booking</span>
              </Link>
              <p className="mt-3 text-sm text-[#6B7280]">
                The booking platform built for private rental car operators.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-[#374151]">Product</h4>
              <ul className="mt-3 flex flex-col gap-2">
                <li><Link href="/#features" className="text-sm text-[#6B7280] hover:text-[#374151]">Features</Link></li>
                <li><Link href="/pricing" className="text-sm text-[#6B7280] hover:text-[#374151]">Pricing</Link></li>
                <li><Link href="/affiliates" className="text-sm text-[#6B7280] hover:text-[#374151]">Affiliates</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-[#374151]">Company</h4>
              <ul className="mt-3 flex flex-col gap-2">
                <li><Link href="/auth/login" className="text-sm text-[#6B7280] hover:text-[#374151]">Login</Link></li>
                <li><Link href="/auth/signup" className="text-sm text-[#6B7280] hover:text-[#374151]">Sign Up</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-[#374151]">Legal</h4>
              <ul className="mt-3 flex flex-col gap-2">
                <li><Link href="/privacy" className="text-sm text-[#6B7280] hover:text-[#374151]">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-sm text-[#6B7280] hover:text-[#374151]">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-[#E5E7EB] pt-6 text-center text-sm text-[#6B7280]">
            &copy; {new Date().getFullYear()} PCR Booking. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
