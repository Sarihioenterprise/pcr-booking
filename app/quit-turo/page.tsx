import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Check, X, TrendingUp, CreditCard, FileText, Car } from "lucide-react";

export const metadata = {
  title: "Turo Alternative — Keep 100% of Your Revenue | PCR Booking",
  description:
    "Stop paying Turo 25-35% on every booking. PCR Booking gives independent car rental operators their own booking page, automated payments, digital agreements, and fleet management — starting free.",
};

export default function QuitTuroPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#080812", color: "#fff" }}>
      {/* NAV */}
      <nav
        className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-md"
        style={{ backgroundColor: "rgba(8,8,18,0.95)" }}
      >
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.png" alt="PCR Booking" width={32} height={32} className="rounded-md" />
            <span className="font-bold text-lg text-white">PCR Booking</span>
          </Link>
          <Link href="/auth/signup">
            <Button
              className="font-semibold px-5 py-2 rounded-lg text-sm"
              style={{ backgroundColor: "#2EBD6B", color: "#fff" }}
            >
              Start Free
            </Button>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-24 text-center">
        <div
          className="inline-block text-xs font-semibold uppercase tracking-widest rounded-full px-4 py-1 mb-6"
          style={{ backgroundColor: "rgba(46,189,107,0.15)", color: "#2EBD6B" }}
        >
          Turo Alternative
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6">
          Stop Paying Turo{" "}
          <span style={{ color: "#ef4444" }}>25–35%.</span>
          <br />
          <span style={{ color: "#2EBD6B" }}>Keep Every Dollar.</span>
        </h1>
        <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10">
          PCR Booking gives independent car rental operators everything they need to run their
          business — without giving a cut to anyone.
        </p>
        <Link href="/auth/signup">
          <Button
            className="text-base font-bold px-8 py-5 rounded-xl shadow-lg"
            style={{ backgroundColor: "#2EBD6B", color: "#fff" }}
          >
            Start Free — No Credit Card
          </Button>
        </Link>
        <p className="mt-4 text-sm text-white/40">Free for up to 3 cars. Paid plans from $79/mo.</p>
      </section>

      {/* TURO MATH */}
      <section className="py-20 px-4" style={{ backgroundColor: "#0c0c1c" }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">
            Here&apos;s What Turo Is Taking From You
          </h2>
          <p className="text-center text-white/50 mb-14 text-base">
            Based on $2,000/month in gross earnings per car
          </p>

          <div className="grid sm:grid-cols-2 gap-6 mb-10">
            {/* Turo Column */}
            <div
              className="rounded-2xl p-8 border"
              style={{ backgroundColor: "#1a0a0a", borderColor: "rgba(239,68,68,0.3)" }}
            >
              <div className="flex items-center gap-2 mb-6">
                <X className="w-5 h-5" style={{ color: "#ef4444" }} />
                <span className="font-bold text-lg" style={{ color: "#ef4444" }}>
                  With Turo
                </span>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-white/60">Gross earnings</span>
                  <span className="font-semibold">$2,000</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-white/60">Turo's cut (25–35%)</span>
                  <span className="font-bold" style={{ color: "#ef4444" }}>
                    −$500 to −$700
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-white/60">Platform fee</span>
                  <span className="font-bold" style={{ color: "#ef4444" }}>
                    −$0
                  </span>
                </div>
                <div className="flex justify-between py-4 rounded-xl px-3" style={{ backgroundColor: "rgba(239,68,68,0.1)" }}>
                  <span className="font-bold">You keep</span>
                  <span className="text-xl font-extrabold" style={{ color: "#ef4444" }}>
                    $1,300–$1,500
                  </span>
                </div>
              </div>
            </div>

            {/* PCR Column */}
            <div
              className="rounded-2xl p-8 border"
              style={{ backgroundColor: "#0a1a0f", borderColor: "rgba(46,189,107,0.4)" }}
            >
              <div className="flex items-center gap-2 mb-6">
                <Check className="w-5 h-5" style={{ color: "#2EBD6B" }} />
                <span className="font-bold text-lg" style={{ color: "#2EBD6B" }}>
                  With PCR Booking
                </span>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-white/60">Gross earnings</span>
                  <span className="font-semibold">$2,000</span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-white/60">Platform cut</span>
                  <span className="font-bold" style={{ color: "#2EBD6B" }}>
                    $0
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b border-white/10">
                  <span className="text-white/60">PCR Booking plan</span>
                  <span className="font-bold" style={{ color: "#2EBD6B" }}>
                    −$79/mo
                  </span>
                </div>
                <div className="flex justify-between py-4 rounded-xl px-3" style={{ backgroundColor: "rgba(46,189,107,0.1)" }}>
                  <span className="font-bold">You keep</span>
                  <span className="text-xl font-extrabold" style={{ color: "#2EBD6B" }}>
                    $1,921
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl p-6 text-center"
            style={{ backgroundColor: "rgba(46,189,107,0.1)", border: "1px solid rgba(46,189,107,0.3)" }}
          >
            <p className="text-2xl font-extrabold" style={{ color: "#2EBD6B" }}>
              That&apos;s $400–$600 MORE per month, per car.
            </p>
            <p className="text-white/60 mt-2 text-sm">
              With a 5-car fleet, that&apos;s up to $3,000/month back in your pocket.
            </p>
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="py-20 px-4" style={{ backgroundColor: "#080812" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">
            Everything You Need to Run Your Fleet
          </h2>
          <p className="text-center text-white/50 mb-14 text-base max-w-xl mx-auto">
            No marketplace. No middleman. Just your business, your customers, and your revenue.
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: TrendingUp,
                title: "Your Own Booking Page",
                desc: "Share your link. Renters book directly. No marketplace fees — ever.",
              },
              {
                icon: CreditCard,
                title: "Automated Payments",
                desc: "Collect deposits and weekly payments automatically. Late fees handled for you.",
              },
              {
                icon: FileText,
                title: "Digital Agreements",
                desc: "Renters sign your rental agreement digitally. Every booking protected.",
              },
              {
                icon: Car,
                title: "Fleet Management",
                desc: "Track all your cars, availability, maintenance, and revenue in one place.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl p-7 border border-white/10 flex gap-5 items-start"
                style={{ backgroundColor: "#0c0c1c" }}
              >
                <div
                  className="rounded-xl p-3 flex-shrink-0"
                  style={{ backgroundColor: "rgba(46,189,107,0.15)" }}
                >
                  <Icon className="w-6 h-6" style={{ color: "#2EBD6B" }} />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 px-4" style={{ backgroundColor: "#0c0c1c" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-4">Simple Pricing</h2>
          <p className="text-center text-white/50 mb-14 text-base">
            No percentages. No surprises. Flat monthly fee.
          </p>

          <div className="grid sm:grid-cols-3 gap-6">
            {/* Free */}
            <div className="rounded-2xl p-8 border border-white/10 flex flex-col" style={{ backgroundColor: "#0c0c1c" }}>
              <h3 className="font-bold text-xl mb-1 text-white">Free</h3>
              <p className="text-white/50 text-sm mb-6">Get started, no risk</p>
              <div className="mb-8">
                <span className="text-4xl font-extrabold text-white">$0</span>
                <span className="text-white/40 text-sm">/mo</span>
              </div>
              <ul className="space-y-3 text-sm text-white/70 mb-8 flex-1">
                {["Up to 3 cars", "Booking page", "Digital agreements", "Basic dashboard"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#2EBD6B" }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup">
                <button className="w-full py-2.5 rounded-lg font-semibold text-white border border-white/30 hover:border-white/60 transition-colors">
                  Get Started
                </button>
              </Link>
            </div>

            {/* Growth */}
            <div className="rounded-2xl p-8 border-2 flex flex-col relative" style={{ backgroundColor: "#0c0c1c", borderColor: "#2EBD6B" }}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full" style={{ backgroundColor: "#2EBD6B", color: "#080812" }}>
                Most Popular
              </div>
              <h3 className="font-bold text-xl mb-1 text-white">Growth</h3>
              <p className="text-white/50 text-sm mb-6">For serious operators</p>
              <div className="mb-8">
                <span className="text-4xl font-extrabold text-white">$79</span>
                <span className="text-white/40 text-sm">/mo</span>
              </div>
              <ul className="space-y-3 text-sm text-white/70 mb-8 flex-1">
                {["Unlimited cars", "Full dashboard", "Automated payments", "Late fee automation", "Collections & dunning"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#2EBD6B" }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup">
                <button className="w-full py-2.5 rounded-lg font-bold text-white transition-colors hover:opacity-90" style={{ backgroundColor: "#2EBD6B" }}>
                  Get Started
                </button>
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl p-8 border border-white/10 flex flex-col" style={{ backgroundColor: "#0c0c1c" }}>
              <h3 className="font-bold text-xl mb-1 text-white">Pro</h3>
              <p className="text-white/50 text-sm mb-6">Scale your operation</p>
              <div className="mb-8">
                <span className="text-4xl font-extrabold text-white">$149</span>
                <span className="text-white/40 text-sm">/mo</span>
              </div>
              <ul className="space-y-3 text-sm text-white/70 mb-8 flex-1">
                {["Everything in Growth", "Advanced analytics", "Priority support", "Multi-location support", "API access"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#2EBD6B" }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup">
                <button className="w-full py-2.5 rounded-lg font-semibold text-white border border-white/30 hover:border-white/60 transition-colors">
                  Get Started
                </button>
              </Link>
            </div>

            {/* Scale */}
            <div className="rounded-2xl p-8 border border-white/10 flex flex-col" style={{ backgroundColor: "#0c0c1c" }}>
              <h3 className="font-bold text-xl mb-1 text-white">Scale</h3>
              <p className="text-white/50 text-sm mb-6">For large fleets</p>
              <div className="mb-8">
                <span className="text-4xl font-extrabold text-white">$249</span>
                <span className="text-white/40 text-sm">/mo</span>
              </div>
              <ul className="space-y-3 text-sm text-white/70 mb-8 flex-1">
                {["Everything in Pro", "Custom booking page branding", "White label renter portal", "Dedicated onboarding call", "50+ vehicles"].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: "#2EBD6B" }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup">
                <button className="w-full py-2.5 rounded-lg font-semibold text-white border border-white/30 hover:border-white/60 transition-colors">
                  Get Started
                </button>
              </Link>
            </div>
          </div>

          <p className="text-center text-white/40 text-sm mt-8">
            Annual plans available — save 2 months
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 px-4" style={{ backgroundColor: "#080812" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-6 leading-tight">
            Ready to Keep{" "}
            <span style={{ color: "#2EBD6B" }}>100% of Your Revenue?</span>
          </h2>
          <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto">
            Join operators who left the platforms and took control of their business.
          </p>
          <Link href="/auth/signup">
            <Button
              className="text-lg font-bold px-10 py-6 rounded-xl shadow-2xl"
              style={{ backgroundColor: "#2EBD6B", color: "#fff" }}
            >
              Start Free Today
            </Button>
          </Link>
          <p className="mt-5 text-sm text-white/40">
            Free forever for up to 3 cars. No credit card required.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="border-t border-white/10 py-10 px-4"
        style={{ backgroundColor: "#0c0c1c" }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <div className="flex items-center gap-2">
            <Image src="/icon.png" alt="PCR Booking" width={24} height={24} className="rounded" />
            <span>© {new Date().getFullYear()} PCR Booking. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white/70 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white/70 transition-colors">
              Terms
            </Link>
            <Link href="/pricing" className="hover:text-white/70 transition-colors">
              Pricing
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
