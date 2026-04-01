import Link from "next/link";
import {
  Car,
  CalendarCheck,
  Bot,
  Smartphone,
  ArrowRight,
  Check,
  Users,
  DollarSign,
  Menu,
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

const features = [
  {
    icon: CalendarCheck,
    title: "Booking Widget",
    description:
      "Embeddable booking form for your website. Renters pick dates, choose a vehicle, and submit — you get notified instantly.",
  },
  {
    icon: Car,
    title: "Fleet Management",
    description:
      "Track every vehicle in your fleet. Set daily rates, toggle availability, and view booking history at a glance.",
  },
  {
    icon: Bot,
    title: "AI Qualification Bot",
    description:
      "Automated calling bot screens leads for license, age, and rideshare approval — so you only talk to qualified renters.",
  },
  {
    icon: Smartphone,
    title: "Mobile Dashboard",
    description:
      "Manage bookings, fleet, and leads from your phone. Built mobile-first for operators on the go.",
  },
];

const steps = [
  {
    num: "1",
    title: "Sign Up",
    description: "Create your account in under 2 minutes. No credit card required.",
  },
  {
    num: "2",
    title: "Embed Widget",
    description:
      "Paste one line of code on your website. Your booking form is live instantly.",
  },
  {
    num: "3",
    title: "Get Bookings",
    description:
      "Leads flow in, the bot qualifies them, and you manage everything from one dashboard.",
  },
];

const pricingTiers = [
  {
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
    name: "Pro",
    price: "$149",
    description: "For growing rental businesses",
    features: [
      "Up to 40 vehicles",
      "Everything in Growth",
      "Multi-location support",
      "AI qualification bot",
      "Priority support",
    ],
    highlighted: true,
  },
  {
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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#080812] text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#080812]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <img src="/icon.png" alt="PCR Logo" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight">
              PCR Booking
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="#features"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="#affiliates"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Affiliates
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="hidden text-sm text-gray-400 transition-colors hover:text-white sm:block"
            >
              Login
            </Link>
            <Link href="/auth/signup">
              <Button className="h-9 bg-[#2EBD6B] px-4 text-sm font-semibold text-white hover:bg-[#1a9952]">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-24 sm:px-6 sm:pt-32 lg:px-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#2EBD6B]/5 blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl text-center">
          <Badge className="mb-6 border-[#2EBD6B]/30 bg-[#2EBD6B]/10 text-[#2EBD6B]">
            Now in Early Access
          </Badge>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            The Booking Platform Built for{" "}
            <span className="text-[#2EBD6B]">Private Rental Operators</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400">
            Stop losing 30% to Turo. Manage your fleet, automate lead
            qualification, and take bookings directly from your website — all
            from one dashboard.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/auth/signup">
              <Button className="h-12 px-8 text-base font-semibold bg-[#2EBD6B] text-white hover:bg-[#1a9952]">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#pricing">
              <Button
                variant="outline"
                className="h-12 border-2 border-[#2EBD6B] px-8 text-base font-semibold text-[#2EBD6B] hover:bg-[#2EBD6B] hover:text-white"
              >
                See Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-white/10 bg-[#0c0c1c] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Giving Turo 30% of every booking?
          </h2>
          <p className="mt-4 text-xl text-[#2EBD6B] font-semibold">
            Keep 100% with your own system.
          </p>
          <p className="mx-auto mt-6 max-w-xl text-gray-400 leading-relaxed">
            Platforms like Turo take a massive cut, control your pricing, and own
            your customer relationships. PCR Booking gives you everything you
            need to run bookings independently — no middleman, no commission.
          </p>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need to Run Your Rental Business
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              From booking intake to fleet tracking, PCR Booking handles it all
              so you can focus on growing.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-white/10 bg-white/5 text-white"
              >
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
                    <feature.icon className="h-5 w-5 text-[#2EBD6B]" />
                  </div>
                  <CardTitle className="text-white">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-gray-400">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-y border-white/10 bg-[#0c0c1c] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            How It Works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-400">
            Get up and running in minutes, not days.
          </p>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.num} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#2EBD6B] text-xl font-bold text-white">
                  {step.num}
                </div>
                <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-400">
            No hidden fees. No per-booking commission. Just a flat monthly rate.
          </p>

          <div className="mx-auto mt-16 grid max-w-5xl gap-6 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <Card
                key={tier.name}
                className={`flex flex-col border-white/10 bg-white/5 text-white ${
                  tier.highlighted
                    ? "ring-2 ring-[#2EBD6B] relative"
                    : ""
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#2EBD6B] text-white">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-white">
                    {tier.name}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {tier.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold text-white">
                      {tier.price}
                    </span>
                    <span className="text-gray-400">/mo</span>
                  </div>
                  <ul className="flex flex-col gap-3">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm text-gray-300"
                      >
                        <Check className="h-4 w-4 shrink-0 text-[#2EBD6B]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/auth/signup" className="w-full">
                    <Button
                      className={`w-full h-10 font-semibold ${
                        tier.highlighted
                          ? "bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      Start Free Trial
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </section>

      {/* Affiliate Section */}
      <section
        id="affiliates"
        className="border-y border-white/10 bg-[#0c0c1c] px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#2EBD6B]/10">
            <DollarSign className="h-7 w-7 text-[#2EBD6B]" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Refer Operators, Earn 30% for 12 Months
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-400 leading-relaxed">
            Know other rental operators? Send them your referral link and earn
            30% recurring commission on every subscription payment for a full
            year. No cap on referrals.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/auth/signup">
              <Button className="h-11 bg-[#2EBD6B] px-6 font-semibold text-white hover:bg-[#1a9952]">
                <Users className="mr-2 h-4 w-4" />
                Join the Affiliate Program
              </Button>
            </Link>
            <Link
              href="/affiliates"
              className="text-sm text-gray-400 underline underline-offset-4 transition-colors hover:text-white"
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Own Your Bookings?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-400">
            Join operators who are keeping 100% of their revenue. Start your
            free trial today — no credit card required.
          </p>
          <Link href="/auth/signup">
            <Button className="mt-8 h-12 px-8 text-base font-semibold bg-[#2EBD6B] text-white hover:bg-[#1a9952]">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#080812] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <img src="/icon.png" alt="PCR Logo" className="h-7 w-7" />
                <span className="font-bold">PCR Booking</span>
              </Link>
              <p className="mt-3 text-sm text-gray-500">
                The booking platform built for private rental car operators.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-300">Product</h4>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <Link
                    href="#features"
                    className="text-sm text-gray-500 hover:text-white"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="text-sm text-gray-500 hover:text-white"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/affiliates"
                    className="text-sm text-gray-500 hover:text-white"
                  >
                    Affiliates
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-300">Company</h4>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <Link
                    href="/auth/login"
                    className="text-sm text-gray-500 hover:text-white"
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/signup"
                    className="text-sm text-gray-500 hover:text-white"
                  >
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-300">Legal</h4>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-gray-500 hover:text-white"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-gray-500 hover:text-white"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 text-center text-sm text-gray-600">
            &copy; {new Date().getFullYear()} PCR Booking. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
