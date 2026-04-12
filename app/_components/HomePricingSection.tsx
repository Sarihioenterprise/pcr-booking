"use client";

import { useState } from "react";
import { Check } from "lucide-react";
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
    description: "Get started — no credit card needed",
    features: [
      "Up to 3 vehicles",
      "Booking widget",
      "Basic fleet management",
      "Email support",
      "Free forever",
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
      "Instant notifications",
      "Priority support",
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
    ],
    highlighted: false,
  },
];

export function HomePricingSection() {
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

  function getPriceDisplay(tier: PricingTier) {
    if (tier.id === "free") return { price: "$0", period: "/mo", badge: null };
    const monthly = MONTHLY_PRICES[tier.id];
    const annual = ANNUAL_PRICES[tier.id];
    if (billing === "annual") {
      return { price: `$${annual.toLocaleString()}`, period: "/yr", badge: "2 months free" };
    }
    return { price: `$${monthly}`, period: "/mo", badge: null };
  }

  return (
    <div className="w-full">
      {/* Billing Toggle */}
      <div className="flex flex-col items-center mb-8">
        <div className="flex rounded-full bg-white/10 p-1">
          <button
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
              billing === "monthly"
                ? "bg-white text-[#080812] shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
              billing === "annual"
                ? "bg-white text-[#080812] shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Annual
            <span className="rounded-full bg-[#2EBD6B] px-2 py-0.5 text-[10px] font-bold text-white">
              SAVE 17%
            </span>
          </button>
        </div>
        {billing === "monthly" && (
          <p className="mt-2 text-xs text-gray-400">+ $199 setup fee (waived on annual)</p>
        )}
      </div>

      {/* Cards */}
      <div className="mx-auto mt-4 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pricingTiers.map((tier) => {
          const { price, period, badge } = getPriceDisplay(tier);
          return (
            <Card
              key={tier.name}
              className={`flex flex-col border-white/10 bg-white/5 text-white ${
                tier.highlighted ? "ring-2 ring-[#2EBD6B] relative" : ""
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[#2EBD6B] text-white">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="pb-2 px-4 pt-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-white">{tier.name}</CardTitle>
                  {badge && (
                    <span className="rounded-full bg-[#2EBD6B]/20 px-2 py-0.5 text-[10px] font-bold text-[#2EBD6B]">
                      {badge}
                    </span>
                  )}
                </div>
                <CardDescription className="text-gray-400 text-xs leading-snug">
                  {tier.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col px-4">
                <div className="mb-4">
                  <span className="text-3xl font-extrabold text-white">{price}</span>
                  <span className="text-gray-400 text-sm">{period}</span>
                </div>
                <ul className="flex flex-col gap-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs text-gray-300">
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#2EBD6B]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="px-4 pb-4">
                <Button
                  className={`w-full h-9 text-sm font-semibold ${
                    tier.highlighted
                      ? "bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                  disabled={loadingPlan !== null}
                  onClick={() => handleStartTrial(tier.id)}
                >
                  {loadingPlan === tier.id
                    ? "Redirecting..."
                    : tier.id === "free"
                    ? "Get Started Free"
                    : "Start Free Trial"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
        {checkoutError && (
          <p className="col-span-4 mt-2 text-center text-sm text-red-400">{checkoutError}</p>
        )}
      </div>
    </div>
  );
}
