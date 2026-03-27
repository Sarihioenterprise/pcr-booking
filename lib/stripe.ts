import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-03-25.dahlia",
    });
  }
  return _stripe;
}

export const PLANS = {
  growth: {
    name: "Growth",
    price: 79,
    vehicles: 15,
    features: [
      "Up to 15 vehicles",
      "Booking widget",
      "Lead management",
      "AI qualification bot",
      "Email support",
    ],
  },
  pro: {
    name: "Pro",
    price: 149,
    vehicles: 40,
    features: [
      "Up to 40 vehicles",
      "Multi-location support",
      "Priority support",
      "Advanced analytics",
      "Custom branding",
    ],
  },
  scale: {
    name: "Scale",
    price: 249,
    vehicles: Infinity,
    features: [
      "Unlimited vehicles",
      "White-label solution",
      "Dedicated account manager",
      "API access",
      "Priority support",
    ],
  },
} as const;
