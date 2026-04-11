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

const pricingTiers: { id: PlanId; name: string; price: string; description: string; features: string[]; highlighted: boolean }[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
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
    price: "$79",
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
    price: "$149",
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
    price: "$249",
    description: "For established fleet operators",
    features: [
      "Unlimited vehicles",
      "Everything in Pro",
      "White-label branding",
      "API access",
      "Dedicated account manager",
    ],
    highlighted: false,
  },
];

export function HomePricingSection() {
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function handleStartTrial(plan: PlanId) {
    setCheckoutError(null);
    setLoadingPlan(plan);
    try {
      // Free plan goes straight to signup
      if (plan === "free") {
        window.location.href = "/auth/signup";
        return;
      }

      const res = await fetch("/api/billing/checkout-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
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
    <div className="mx-auto mt-16 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {pricingTiers.map((tier) => (
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
            <CardTitle className="text-base text-white">{tier.name}</CardTitle>
            <CardDescription className="text-gray-400 text-xs leading-snug">
              {tier.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col px-4">
            <div className="mb-4">
              <span className="text-3xl font-extrabold text-white">
                {tier.price}
              </span>
              <span className="text-gray-400 text-sm">/mo</span>
            </div>
            <ul className="flex flex-col gap-2">
              {tier.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-xs text-gray-300"
                >
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
              {loadingPlan === tier.id ? "Redirecting..." : tier.id === "free" ? "Get Started Free" : "Start Free Trial"}
            </Button>
          </CardFooter>
        </Card>
      ))}
      {checkoutError && (
        <p className="col-span-3 mt-2 text-center text-sm text-red-400">
          {checkoutError}
        </p>
      )}
    </div>
  );
}
