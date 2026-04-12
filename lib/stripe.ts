import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-02-24.acacia",
      maxNetworkRetries: 0, // disable SDK retries — we handle errors ourselves
      timeout: 10000,       // 10s timeout
    });
  }
  return _stripe;
}

export const PRICE_IDS = {
  growth: process.env.STRIPE_PRICE_GROWTH || "",
  pro: process.env.STRIPE_PRICE_PRO || "",
  scale: process.env.STRIPE_PRICE_SCALE || "",
  growth_annual: process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID || "price_annual_growth_placeholder",
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || "price_annual_pro_placeholder",
  scale_annual: process.env.STRIPE_SCALE_ANNUAL_PRICE_ID || "price_annual_scale_placeholder",
};

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
      "Custom booking page branding",
      "API access",
      "Priority support",
    ],
  },
} as const;
