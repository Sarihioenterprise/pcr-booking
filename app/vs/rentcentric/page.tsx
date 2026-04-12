import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Check, X, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "RentCentric Alternative — PCR Booking vs RentCentric",
  description:
    "Looking for a RentCentric alternative? PCR Booking starts free and goes up to $249/mo — with more features built specifically for independent car rental operators. No contracts.",
};

const tableRows = [
  {
    feature: "Free tier",
    pcr: { icon: "check", text: "Up to 3 cars free" },
    competitor: { icon: "x", text: "No free tier" },
  },
  {
    feature: "Starting price",
    pcr: { icon: "check", text: "From $79/mo" },
    competitor: { icon: "x", text: "$300+/mo" },
  },
  {
    feature: "Setup time",
    pcr: { icon: "check", text: "Under 10 minutes" },
    competitor: { icon: "x", text: "Days/weeks" },
  },
  {
    feature: "Built for independent operators",
    pcr: { icon: "check", text: "Yes" },
    competitor: { icon: "warn", text: "Enterprise-focused" },
  },
  {
    feature: "Digital agreements",
    pcr: { icon: "check", text: "Included" },
    competitor: { icon: "check", text: "Yes" },
  },
  {
    feature: "Automated payments & dunning",
    pcr: { icon: "check", text: "Built in" },
    competitor: { icon: "check", text: "Yes" },
  },
  {
    feature: "AI support chat",
    pcr: { icon: "check", text: "24/7" },
    competitor: { icon: "x", text: "No" },
  },
  {
    feature: "Renter blacklist",
    pcr: { icon: "check", text: "Yes" },
    competitor: { icon: "x", text: "No" },
  },
  {
    feature: "Affiliate program",
    pcr: { icon: "check", text: "30% recurring" },
    competitor: { icon: "x", text: "No" },
  },
  {
    feature: "Annual pricing",
    pcr: { icon: "check", text: "Save 2 months" },
    competitor: { icon: "x", text: "No" },
  },
  {
    feature: "No long-term contract",
    pcr: { icon: "check", text: "Cancel anytime" },
    competitor: { icon: "x", text: "Annual contracts" },
  },
];

function CellIcon({ icon }: { icon: string }) {
  if (icon === "check")
    return <Check className="w-5 h-5 flex-shrink-0" style={{ color: "#2EBD6B" }} />;
  if (icon === "warn")
    return <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: "#f59e0b" }} />;
  return <X className="w-5 h-5 flex-shrink-0" style={{ color: "#ef4444" }} />;
}

export default function RentCentricAlternativePage() {
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
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-24 text-center">
        <div
          className="inline-block text-xs font-semibold uppercase tracking-widest rounded-full px-4 py-1 mb-6"
          style={{ backgroundColor: "rgba(46,189,107,0.15)", color: "#2EBD6B" }}
        >
          RentCentric Alternative
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6">
          Looking for a{" "}
          <span style={{ color: "#2EBD6B" }}>RentCentric Alternative?</span>
        </h1>
        <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10">
          RentCentric charges $300+/month. PCR Booking starts free and goes up to $249/mo —
          with more features built specifically for independent car rental operators.
        </p>
        <Link href="/auth/signup">
          <Button
            className="text-base font-bold px-8 py-5 rounded-xl shadow-lg"
            style={{ backgroundColor: "#2EBD6B", color: "#fff" }}
          >
            Try PCR Booking Free
          </Button>
        </Link>
        <p className="mt-4 text-sm text-white/40">
          Free forever for up to 3 cars. No credit card required.
        </p>
      </section>

      {/* COMPARISON TABLE */}
      <section className="py-20 px-4" style={{ backgroundColor: "#0c0c1c" }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-12">
            PCR Booking vs RentCentric
          </h2>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#080812" }}>
                  <th className="text-left px-6 py-4 text-white/50 font-semibold w-1/3">Feature</th>
                  <th className="px-6 py-4 text-center font-bold text-base" style={{ color: "#2EBD6B" }}>
                    PCR Booking
                  </th>
                  <th className="px-6 py-4 text-center font-bold text-base text-white/60">
                    RentCentric
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr
                    key={row.feature}
                    className="border-t border-white/10"
                    style={{ backgroundColor: i % 2 === 0 ? "#0c0c1c" : "#0a0a18" }}
                  >
                    <td className="px-6 py-4 text-white/80 font-medium">{row.feature}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <CellIcon icon={row.pcr.icon} />
                        <span className="text-white/90">{row.pcr.text}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <CellIcon icon={row.competitor.icon} />
                        <span className="text-white/60">{row.competitor.text}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {tableRows.map((row) => (
              <div
                key={row.feature}
                className="rounded-xl border border-white/10 p-4"
                style={{ backgroundColor: "#080812" }}
              >
                <p className="font-semibold text-white/80 mb-3 text-sm">{row.feature}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(46,189,107,0.08)" }}>
                    <p className="text-xs font-bold mb-2" style={{ color: "#2EBD6B" }}>PCR Booking</p>
                    <div className="flex items-center gap-1.5">
                      <CellIcon icon={row.pcr.icon} />
                      <span className="text-xs text-white/80">{row.pcr.text}</span>
                    </div>
                  </div>
                  <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                    <p className="text-xs font-bold mb-2 text-white/50">RentCentric</p>
                    <div className="flex items-center gap-1.5">
                      <CellIcon icon={row.competitor.icon} />
                      <span className="text-xs text-white/60">{row.competitor.text}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PAIN POINT CALLOUT */}
      <section className="py-16 px-4" style={{ backgroundColor: "#080812" }}>
        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-2xl border p-8 text-center"
            style={{
              backgroundColor: "rgba(46,189,107,0.08)",
              borderColor: "rgba(46,189,107,0.35)",
            }}
          >
            <p className="text-2xl sm:text-3xl font-extrabold leading-snug" style={{ color: "#2EBD6B" }}>
              💸 $2,110 back in your pocket every year.
            </p>
            <p className="mt-4 text-white/70 text-base sm:text-lg leading-relaxed">
              At $300/mo, RentCentric costs <strong className="text-white">$3,600/year</strong>.
              PCR Booking Pro is <strong className="text-white">$1,490/year</strong> on annual —
              that&apos;s $2,110 back in your pocket every year.
            </p>
          </div>
        </div>
      </section>

      {/* WHY OPERATORS SWITCH */}
      <section className="py-20 px-4" style={{ backgroundColor: "#080812" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center mb-12">
            Why Operators Switch
          </h2>
          <div className="space-y-5">
            {[
              "RentCentric was built for traditional car rental companies with large fleets. PCR Booking was built for independent operators — the setup is simpler, the price is lower, and the features are what you actually need.",
              "At $300+/month, RentCentric costs more than most operators make in their first month. PCR Booking starts free.",
              "No contracts. No setup fees on annual plans. Cancel anytime.",
            ].map((point, i) => (
              <div
                key={i}
                className="flex gap-4 items-start rounded-2xl p-6 border border-white/10"
                style={{ backgroundColor: "#0c0c1c" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                  style={{ backgroundColor: "rgba(46,189,107,0.2)", color: "#2EBD6B" }}
                >
                  {i + 1}
                </div>
                <p className="text-white/80 leading-relaxed pt-0.5">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 px-4" style={{ backgroundColor: "#0c0c1c" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-6 leading-tight">
            Same Features. A Fraction of the Price.
          </h2>
          <p className="text-lg text-white/60 mb-10 max-w-xl mx-auto">
            Free for up to 3 cars. Paid plans from $79/mo.
          </p>
          <Link href="/auth/signup">
            <Button
              className="text-lg font-bold px-10 py-6 rounded-xl shadow-2xl"
              style={{ backgroundColor: "#2EBD6B", color: "#fff" }}
            >
              Start Free — No Credit Card
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
        style={{ backgroundColor: "#080812" }}
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
