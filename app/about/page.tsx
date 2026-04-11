import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
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
              href="/#features"
              className="text-sm text-gray-400 transition-colors hover:text-white"
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
              className="text-sm text-[#2EBD6B] font-medium"
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
              href="#affiliates"
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
            Built by an Operator,{" "}
            <span className="text-[#2EBD6B]">for Operators</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400">
            PCR Booking was built because one operator saw the problem and refused to accept it.
          </p>
        </div>
      </section>

      {/* Founder Story Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 flex flex-col items-center gap-8 sm:flex-row">
            {/* Photo */}
            <div className="flex-shrink-0">
              <div className="relative h-56 w-56 rounded-full border-4 border-[#2EBD6B] bg-[#0c0c1c] flex items-center justify-center overflow-hidden">
                <img
                  src="/alton.jpg"
                  alt="Alton Guyton"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    target.nextElementSibling?.classList.remove("hidden");
                  }}
                />
                <div className="hidden absolute inset-0 flex items-center justify-center bg-[#2EBD6B]/10">
                  <span className="text-5xl font-bold text-[#2EBD6B]">AG</span>
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="flex-1">
              <h2 className="text-3xl font-bold tracking-tight">
                Meet Alton Guyton
              </h2>
              <p className="mt-4 text-gray-400 leading-relaxed">
                Alton spent 10 years in ads and marketing, helping businesses grow
                online. But in 2019, he decided to invest differently — he bought
                cars and started his own private rental business. That's when
                everything changed.
              </p>
              <p className="mt-4 text-gray-400 leading-relaxed">
                For 4-5 years, Alton lived the daily grind of managing bookings via
                spreadsheets, juggling renters in different messaging apps, and
                watching his revenue get cut by platform fees. His clients — other
                operators just like him — were in the same boat. They'd book cars
                through platforms but had no clean way to manage their own fleets.
                It was chaos.
              </p>
              <p className="mt-4 text-gray-400 leading-relaxed">
                So Alton built PCR Booking. Not to be another middleman taking a cut,
                but because operators deserved better. A system where you open the app,
                see everything in one place, and have peace of mind. No spreadsheets.
                No platform fees. Just control.
              </p>
            </div>
          </div>

          {/* Why I Built This */}
          <div className="mt-20 border-t border-white/10 pt-20">
            <h3 className="text-2xl font-bold tracking-tight">
              Why I Built This
            </h3>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
                  <span className="text-xl font-bold text-[#2EBD6B]">1</span>
                </div>
                <h4 className="mt-4 font-semibold">Operators Deserved Better</h4>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  Independent operators had no software built for their workflow. They
                  were stuck between spreadsheets and taking platform cuts.
                </p>
              </div>
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
                  <span className="text-xl font-bold text-[#2EBD6B]">2</span>
                </div>
                <h4 className="mt-4 font-semibold">The Pain Was Real</h4>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  Alton saw it every day: no way to track fleet availability, manage
                  renters in one place, or know your numbers at a glance.
                </p>
              </div>
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
                  <span className="text-xl font-bold text-[#2EBD6B]">3</span>
                </div>
                <h4 className="mt-4 font-semibold">Keep What's Yours</h4>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  You built your business. You took the risk. You deserve to keep 100%
                  of your revenue.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-white/10 bg-[#0c0c1c] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-3 text-center">
            <div>
              <div className="text-4xl font-bold text-[#2EBD6B]">10+</div>
              <p className="mt-2 text-gray-400">Years in Ads & Marketing</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#2EBD6B]">4-5</div>
              <p className="mt-2 text-gray-400">Years in Car Rentals</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-[#2EBD6B]">1</div>
              <p className="mt-2 text-gray-400">Platform Built for Operators Like You</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Take Control of Your Bookings?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-400">
            Join operators who are keeping 100% of their revenue and managing their
            business on their own terms.
          </p>
          <Link href="/auth/signup">
            <Button className="mt-8 h-12 px-8 text-base font-semibold bg-[#2EBD6B] text-white hover:bg-[#1a9952]">
              Start Your Free Trial
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
                    href="/#features"
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
