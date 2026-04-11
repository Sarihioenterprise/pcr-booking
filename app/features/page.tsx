import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Car,
  Bot,
  Smartphone,
  CreditCard,
  BarChart3,
  FileText,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: CalendarCheck,
    title: "Booking Widget",
    description:
      "Drop one line of code on your website and start receiving bookings instantly.",
    bullets: [
      "Customizable with your brand colors",
      "Mobile-optimized for renters",
      "Instant email + SMS notification on submission",
      "Works on any website platform",
    ],
  },
  {
    icon: Car,
    title: "Fleet Management",
    description:
      "Track every vehicle, set rates, and manage availability from one dashboard.",
    bullets: [
      "Add unlimited vehicles (Growth+)",
      "Set daily, weekly, monthly rates",
      "Toggle availability instantly",
      "Track vehicle documents and photos",
    ],
  },
  {
    icon: Bot,
    title: "AI Qualification Bot",
    description:
      "Sarah calls every lead and screens them before you even see the notification.",
    bullets: [
      "Screens for valid license, age, rideshare approval",
      "Records call for your review",
      "Auto-updates lead status",
      "You only talk to qualified renters",
    ],
  },
  {
    icon: Smartphone,
    title: "Renter Portal",
    description:
      "Give renters a self-service space to manage their bookings online.",
    bullets: [
      "View booking details and status",
      "Sign rental agreements digitally",
      "Submit support tickets",
      "Pay deposits online",
    ],
  },
  {
    icon: CreditCard,
    title: "Payment Processing",
    description:
      "Stripe-powered payments that process automatically and securely.",
    bullets: [
      "Collect deposits and rental payments",
      "Automated payment schedules",
      "Promo codes and discounts",
      "Full payment history and reconciliation",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    description:
      "Know your numbers at a glance with real-time dashboards and reports.",
    bullets: [
      "Revenue by vehicle and period",
      "Booking trends and occupancy rates",
      "Export reports to CSV",
      "Lead pipeline tracking",
    ],
  },
  {
    icon: FileText,
    title: "Digital Agreements",
    description:
      "Rental agreements signed online and stored securely in one place.",
    bullets: [
      "Customizable agreement templates",
      "E-signature built in",
      "Stored securely, accessible anytime",
      "Auto-sent on booking confirmation",
    ],
  },
  {
    icon: Smartphone,
    title: "Mobile Dashboard",
    description:
      "Manage your entire business from your phone, anytime, anywhere.",
    bullets: [
      "iOS and Android via browser",
      "Push notifications for new bookings",
      "Manage fleet on the go",
      "Same features as desktop",
    ],
  },
];

const comparisonTable = [
  {
    feature: "Booking management",
    pcrbooking: true,
    spreadsheets: false,
    turo: true,
  },
  {
    feature: "Keep 100% revenue",
    pcrbooking: true,
    spreadsheets: true,
    turo: false,
  },
  {
    feature: "Fleet tracking",
    pcrbooking: true,
    spreadsheets: false,
    turo: "limited",
  },
  {
    feature: "AI lead screening",
    pcrbooking: true,
    spreadsheets: false,
    turo: false,
  },
  {
    feature: "Your own branding",
    pcrbooking: true,
    spreadsheets: false,
    turo: false,
  },
  {
    feature: "Monthly cost",
    pcrbooking: "$79+",
    spreadsheets: "$0",
    turo: "25-35% per booking",
  },
];

function FeatureCard({ icon: Icon, title, description, bullets }: any) {
  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
          <Icon className="h-6 w-6 text-[#2EBD6B]" />
        </div>
        <CardTitle className="text-xl text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm leading-relaxed text-gray-400">
          {description}
        </p>
        <ul className="flex flex-col gap-2">
          {bullets.map((bullet: string) => (
            <li key={bullet} className="flex items-start gap-2 text-sm text-gray-300">
              <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#2EBD6B]" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default function FeaturesPage() {
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
              href="/features"
              className="text-sm text-[#2EBD6B] font-medium"
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              About
            </Link>
            <Link
              href="/blog"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Blog
            </Link>
            <Link
              href="/#affiliates"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Affiliates
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm text-gray-400 transition-colors hover:text-white"
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
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Everything You Need to Run Your{" "}
            <span className="text-[#2EBD6B]">Rental Business</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400">
            One platform. Fleet management, bookings, payments, and more. Built for
            operators who want to keep 100% of their revenue.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                bullets={feature.bullets}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="border-y border-white/10 bg-[#0c0c1c] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Why Choose PCR Booking?
            </h2>
            <p className="mt-4 text-gray-400">
              Compare us to alternatives and see why operators are switching.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left font-semibold text-white">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-[#2EBD6B]">
                    PCR Booking
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-400">
                    Spreadsheets
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-400">
                    Turo
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonTable.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="px-4 py-4 text-white">{row.feature}</td>
                    <td className="px-4 py-4 text-center">
                      {row.pcrbooking === true ? (
                        <Check className="mx-auto h-5 w-5 text-[#2EBD6B]" />
                      ) : row.pcrbooking === false ? (
                        <span className="text-gray-500">−</span>
                      ) : (
                        <span className="text-[#2EBD6B] font-medium">{row.pcrbooking}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {row.spreadsheets === true ? (
                        <Check className="mx-auto h-5 w-5 text-gray-400" />
                      ) : row.spreadsheets === false ? (
                        <span className="text-gray-500">−</span>
                      ) : (
                        <span className="text-gray-400">{row.spreadsheets}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {row.turo === true ? (
                        <Check className="mx-auto h-5 w-5 text-gray-400" />
                      ) : row.turo === false ? (
                        <span className="text-gray-500">−</span>
                      ) : row.turo === "limited" ? (
                        <span className="text-gray-400">Limited</span>
                      ) : (
                        <span className="text-gray-400">{row.turo}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Take Control?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-400">
            Start your free trial today. No credit card required. See all these
            features in action.
          </p>
          <Link href="/auth/signup">
            <Button className="mt-8 h-12 px-8 text-base font-semibold bg-[#2EBD6B] text-white hover:bg-[#1a9952]">
              Start Free — No Credit Card Required
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
                    href="/features"
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
                    href="/blog"
                    className="text-sm text-gray-500 hover:text-white"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#affiliates"
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
