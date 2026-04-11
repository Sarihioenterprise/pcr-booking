"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Check } from "lucide-react";

type Plan = "growth" | "pro" | "scale";

const plans = [
  {
    id: "growth" as Plan,
    name: "Growth",
    price: "$79",
    description: "Perfect for small fleets getting started.",
    features: [
      "Up to 10 cars",
      "Online booking portal",
      "Customer management",
      "Basic analytics",
      "Email support",
    ],
    popular: false,
  },
  {
    id: "pro" as Plan,
    name: "Pro",
    price: "$149",
    description: "For growing businesses that need more.",
    features: [
      "Up to 25 cars",
      "Everything in Growth",
      "Priority support",
      "Advanced analytics",
      "Custom booking rules",
      "SMS notifications",
    ],
    popular: true,
  },
  {
    id: "scale" as Plan,
    name: "Scale",
    price: "$249",
    description: "Enterprise-grade for large operations.",
    features: [
      "Unlimited cars",
      "Everything in Pro",
      "White-label branding",
      "Custom booking page branding",
      "API access",
      "Custom integrations",
    ],
    popular: false,
  },
];

export default function PlanPage() {
  const [loading, setLoading] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelectPlan(plan: Plan) {
    setError(null);
    setLoading(plan);
    try {
      const res = await fetch("/api/billing/checkout-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start checkout");
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <div className="h-8 w-8 rounded-full bg-[#2EBD6B]" />
          <span className="text-xl font-bold tracking-tight text-[#080812]">PCR Booking</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#080812]">Choose your plan</h1>
        <p className="mt-2 text-base text-gray-500 max-w-md mx-auto">
          Start your 14-day free trial today. Card required. Cancel anytime.{" "}
          <span className="font-medium text-[#2EBD6B]">You won't be charged for 14 days.</span>
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative flex flex-col border shadow-sm transition-shadow hover:shadow-md ${
              plan.popular
                ? "border-[#2EBD6B] ring-2 ring-[#2EBD6B]/30"
                : "border-gray-200"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge
                  className="bg-[#2EBD6B] text-white hover:bg-[#2EBD6B] px-3 py-0.5 text-xs font-semibold shadow"
                >
                  Most Popular
                </Badge>
              </div>
            )}

            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-[#080812]">{plan.name}</CardTitle>
              <div className="mt-1 flex items-end gap-1">
                <span className="text-4xl font-extrabold text-[#080812]">{plan.price}</span>
                <span className="mb-1 text-sm text-gray-500">/mo</span>
              </div>
              <CardDescription className="mt-1 text-sm text-gray-500">{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="h-4 w-4 shrink-0 text-[#2EBD6B]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="pt-4">
              <Button
                className={`w-full font-semibold ${
                  plan.popular
                    ? "bg-[#2EBD6B] text-white hover:bg-[#2EBD6B]/90"
                    : "bg-[#0c0c1c] text-white hover:bg-[#0c0c1c]/85"
                }`}
                size="lg"
                disabled={loading !== null}
                onClick={() => handleSelectPlan(plan.id)}
              >
                {loading === plan.id ? "Redirecting..." : "Start 14-Day Free Trial"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {error && (
        <p className="mt-6 text-sm text-red-500">{error}</p>
      )}

      {/* Footer note */}
      <p className="mt-8 text-xs text-gray-400 text-center max-w-sm">
        By selecting a plan you agree to our Terms of Service. Your card will be charged after the 14-day trial unless you cancel.
      </p>
    </div>
  );
}
