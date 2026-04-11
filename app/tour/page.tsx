'use client';

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TourPage() {
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
              href="/tour"
              className="text-sm font-semibold text-[#2EBD6B]"
            >
              Product Tour
            </Link>
            <Link
              href="/features"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Features
            </Link>
            <Link
              href="/#pricing"
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

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pb-20 pt-24 sm:px-6 sm:pt-32 lg:px-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#2EBD6B]/5 blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            See PCR Booking{" "}
            <span className="text-[#2EBD6B]">in Action</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400">
            A complete walkthrough of the platform — no signup required.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4">
            <Link href="/auth/signup">
              <Button className="h-11 px-6 text-base font-semibold bg-[#2EBD6B] text-white hover:bg-[#1a9952]">
                Ready to try it? Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Section 1: Dashboard Overview */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Your Dashboard at a Glance
          </h2>
          <p className="text-gray-400 mb-12 max-w-2xl">
            Get a bird's-eye view of your entire business in one place. Track active rentals, revenue, payments, and more — all in real time.
          </p>

          <div className="grid gap-12 lg:grid-cols-2 items-start">
            {/* Dashboard Mockup */}
            <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              {/* Browser Chrome */}
              <div className="bg-[#0c0c1c] border-b border-white/10 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/60"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/60"></div>
                </div>
                <span className="text-xs text-gray-500 ml-3">pcrbooking.com/dashboard</span>
              </div>

              <div className="flex h-[500px]">
                {/* Sidebar */}
                <div className="w-48 bg-[#0c0c1c] border-r border-white/10 p-6 space-y-1">
                  <div className="text-xs font-bold text-gray-600 uppercase mb-4">Dashboard</div>
                  <div className="text-sm text-white py-2 px-3 rounded bg-[#2EBD6B]/20 text-[#2EBD6B]">Dashboard</div>
                  <div className="text-sm text-gray-400 py-2 px-3 rounded hover:bg-white/5 cursor-pointer">Bookings</div>
                  <div className="text-sm text-gray-400 py-2 px-3 rounded hover:bg-white/5 cursor-pointer">Fleet</div>
                  <div className="text-sm text-gray-400 py-2 px-3 rounded hover:bg-white/5 cursor-pointer">Renters</div>
                  <div className="text-sm text-gray-400 py-2 px-3 rounded hover:bg-white/5 cursor-pointer">Payments</div>
                  <div className="text-sm text-gray-400 py-2 px-3 rounded hover:bg-white/5 cursor-pointer">Support</div>
                  <div className="text-sm text-gray-400 py-2 px-3 rounded hover:bg-white/5 cursor-pointer">Analytics</div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-8 space-y-8">
                  {/* Stat Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-[#0c0c1c] border border-white/10 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">Active Rentals</div>
                      <div className="text-2xl font-bold text-[#2EBD6B]">12</div>
                    </div>
                    <div className="bg-[#0c0c1c] border border-white/10 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">This Month</div>
                      <div className="text-2xl font-bold text-[#2EBD6B]">$4,280</div>
                    </div>
                    <div className="bg-[#0c0c1c] border border-white/10 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">Pending Payments</div>
                      <div className="text-2xl font-bold text-yellow-500">3</div>
                    </div>
                    <div className="bg-[#0c0c1c] border border-white/10 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">Fleet Size</div>
                      <div className="text-2xl font-bold text-white">8</div>
                    </div>
                  </div>

                  {/* Mini Chart */}
                  <div className="bg-[#0c0c1c] border border-white/10 rounded-lg p-4">
                    <div className="text-sm font-semibold mb-4">Revenue Last 7 Days</div>
                    <div className="flex items-end gap-2 h-20">
                      <div className="flex-1 bg-[#2EBD6B]/40 rounded-t-sm" style={{ height: '60%' }}></div>
                      <div className="flex-1 bg-[#2EBD6B]/60 rounded-t-sm" style={{ height: '85%' }}></div>
                      <div className="flex-1 bg-[#2EBD6B]/40 rounded-t-sm" style={{ height: '50%' }}></div>
                      <div className="flex-1 bg-[#2EBD6B] rounded-t-sm" style={{ height: '100%' }}></div>
                      <div className="flex-1 bg-[#2EBD6B]/70 rounded-t-sm" style={{ height: '75%' }}></div>
                      <div className="flex-1 bg-[#2EBD6B]/50 rounded-t-sm" style={{ height: '55%' }}></div>
                      <div className="flex-1 bg-[#2EBD6B] rounded-t-sm" style={{ height: '95%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Callout Bullets */}
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">See all your active rentals at a glance</h3>
                  <p className="mt-2 text-gray-400">No more spreadsheets. Know exactly which cars are booked, who's renting them, and when they're due back.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Track monthly revenue in real time</h3>
                  <p className="mt-2 text-gray-400">Watch your revenue pour in as bookings happen. See which vehicles are your top earners instantly.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Spot overdue payments instantly</h3>
                  <p className="mt-2 text-gray-400">Overdue payment alert badges show you exactly who owes money and how long they're overdue — no manual checking.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Fleet Management */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-[#0c0c1c]">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Manage Your Entire Fleet
          </h2>
          <p className="text-gray-400 mb-12 max-w-2xl">
            Track every vehicle with rates, availability status, and booking history. Control your entire fleet from one table.
          </p>

          <div className="grid gap-12 lg:grid-cols-2 items-start">
            {/* Fleet Table Mockup */}
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              {/* Browser Chrome */}
              <div className="bg-[#080812] border-b border-white/10 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/60"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/60"></div>
                </div>
                <span className="text-xs text-gray-500 ml-3">pcrbooking.com/fleet</span>
              </div>

              <div className="bg-[#0c0c1c] p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold text-white">Vehicles (8)</h3>
                  <button className="px-3 py-1 bg-[#2EBD6B] text-white text-sm rounded hover:bg-[#1a9952]">
                    + Add Vehicle
                  </button>
                </div>

                <div className="space-y-0 border border-white/10 rounded-lg overflow-hidden">
                  {/* Table Header */}
                  <div className="flex bg-[#0c0c1c]/50 border-b border-white/10 px-4 py-3 text-xs font-semibold text-gray-400 uppercase">
                    <div className="flex-1">Vehicle</div>
                    <div className="flex-1">Plate</div>
                    <div className="flex-1">Rate</div>
                    <div className="w-20">Status</div>
                  </div>

                  {/* Table Rows */}
                  <div className="flex border-b border-white/10 px-4 py-3 text-sm hover:bg-white/5">
                    <div className="flex-1 text-white">2022 Honda Accord</div>
                    <div className="flex-1 text-gray-400">GHT-4421</div>
                    <div className="flex-1 text-[#2EBD6B]">$350/wk</div>
                    <div className="w-20 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#2EBD6B]"></span><span className="text-xs">Available</span></div>
                  </div>

                  <div className="flex border-b border-white/10 px-4 py-3 text-sm hover:bg-white/5">
                    <div className="flex-1 text-white">2021 Toyota Camry</div>
                    <div className="flex-1 text-gray-400">JKL-8832</div>
                    <div className="flex-1 text-[#2EBD6B]">$325/wk</div>
                    <div className="w-20 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span><span className="text-xs">Rented</span></div>
                  </div>

                  <div className="flex border-b border-white/10 px-4 py-3 text-sm hover:bg-white/5">
                    <div className="flex-1 text-white">2023 Hyundai Elantra</div>
                    <div className="flex-1 text-gray-400">MNP-2291</div>
                    <div className="flex-1 text-[#2EBD6B]">$300/wk</div>
                    <div className="w-20 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#2EBD6B]"></span><span className="text-xs">Available</span></div>
                  </div>

                  <div className="flex px-4 py-3 text-sm hover:bg-white/5">
                    <div className="flex-1 text-white">2020 Nissan Altima</div>
                    <div className="flex-1 text-gray-400">QRS-7754</div>
                    <div className="flex-1 text-[#2EBD6B]">$295/wk</div>
                    <div className="w-20 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span><span className="text-xs">Service</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Callout Bullets */}
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Track every vehicle — availability, rates, and status</h3>
                  <p className="mt-2 text-gray-400">Green for available, blue for rented, orange for maintenance. Know your fleet's status at a glance.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Set daily, weekly, or monthly rates</h3>
                  <p className="mt-2 text-gray-400">Different pricing strategy per vehicle. Adjust rates whenever you want — changes take effect immediately.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Toggle availability with one click</h3>
                  <p className="mt-2 text-gray-400">Yank a car off the market for service. Turn it back on when it's ready. No downtime, no lost bookings.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Booking Widget */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Booking Widget — Embed on Any Website
          </h2>
          <p className="text-gray-400 mb-12 max-w-2xl">
            Your renters book directly — no middleman. Paste one line of code. Bookings flow straight into your dashboard.
          </p>

          <div className="grid gap-12 lg:grid-cols-2 items-start">
            {/* Widget Mockup - on white background */}
            <div className="rounded-2xl border border-white/10 overflow-hidden p-8 bg-white">
              <div className="space-y-4 max-w-sm">
                <h3 className="text-2xl font-bold text-gray-900">Reserve a Vehicle</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Vehicle</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white">
                    <option>2022 Honda Accord</option>
                    <option>2021 Toyota Camry</option>
                    <option>2023 Hyundai Elantra</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white" />
                </div>

                <button className="w-full py-3 bg-[#2EBD6B] text-white font-semibold rounded-lg hover:bg-[#1a9952]">
                  Submit Booking Request
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Powered by <span className="font-semibold">PCR Booking</span>
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Your renters book directly — no middleman</h3>
                <p className="text-gray-400 leading-relaxed">
                  Paste one line of code on your website. Or share your direct booking link — no website required. Bookings flow straight into your dashboard.
                </p>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Embed anywhere</h3>
                  <p className="mt-2 text-gray-400">Website, Facebook, landing page — embed the widget anywhere your renters might be looking.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Real-time availability</h3>
                  <p className="mt-2 text-gray-400">Widget shows only cars that are actually available. No double-bookings, no conflicts.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Mobile-friendly</h3>
                  <p className="mt-2 text-gray-400">Looks perfect on phones, tablets, and desktops. Renters can book from anywhere.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Renter Management */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-[#0c0c1c]">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Know Every Renter
          </h2>
          <p className="text-gray-400 mb-12 max-w-2xl">
            Complete history, ratings, and behavior flags for every person who rents from you.
          </p>

          <div className="grid gap-12 lg:grid-cols-2 items-start">
            {/* Renters List Mockup */}
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              {/* Browser Chrome */}
              <div className="bg-[#080812] border-b border-white/10 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/60"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/60"></div>
                </div>
                <span className="text-xs text-gray-500 ml-3">pcrbooking.com/renters</span>
              </div>

              <div className="bg-[#0c0c1c] p-6 space-y-4">
                {/* Renter 1 */}
                <div className="border border-white/10 rounded-lg p-4 hover:bg-white/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-white">Marcus Johnson</h4>
                      <div className="flex gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="text-[#2EBD6B] text-sm">★</span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Active Renter • Current since Jan 2026</p>
                    </div>
                    <span className="px-2 py-1 bg-[#2EBD6B]/20 text-[#2EBD6B] text-xs rounded">Active</span>
                  </div>
                </div>

                {/* Renter 2 */}
                <div className="border border-white/10 rounded-lg p-4 hover:bg-white/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-white">Darius Williams</h4>
                      <div className="flex gap-1 mt-1">
                        {[...Array(4)].map((_, i) => (
                          <span key={i} className="text-[#2EBD6B] text-sm">★</span>
                        ))}
                        <span className="text-gray-600 text-sm">★</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">14 rentals • Last: Mar 2026</p>
                    </div>
                    <span className="px-2 py-1 bg-[#2EBD6B]/20 text-[#2EBD6B] text-xs rounded">Active</span>
                  </div>
                </div>

                {/* Renter 3 */}
                <div className="border border-white/10 rounded-lg p-4 hover:bg-white/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-white">Keisha Brown</h4>
                      <div className="flex gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="text-[#2EBD6B] text-sm">★</span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">VIP Renter • 28 rentals — most reliable</p>
                    </div>
                    <span className="px-2 py-1 bg-[#2EBD6B]/20 text-[#2EBD6B] text-xs rounded">VIP</span>
                  </div>
                </div>

                {/* Renter 4 */}
                <div className="border border-red-500/20 rounded-lg p-4 hover:bg-white/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-white">Andre Thompson</h4>
                      <div className="flex gap-1 mt-1">
                        {[...Array(2)].map((_, i) => (
                          <span key={i} className="text-[#2EBD6B] text-sm">★</span>
                        ))}
                        {[...Array(3)].map((_, i) => (
                          <span key={i} className="text-gray-600 text-sm">★</span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">2 late payments • Last: Feb 2026</p>
                    </div>
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">Flagged</span>
                  </div>
                </div>

                {/* Renter 5 */}
                <div className="border border-white/10 rounded-lg p-4 hover:bg-white/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-white">Tamika Davis</h4>
                      <div className="flex gap-1 mt-1">
                        {[...Array(3)].map((_, i) => (
                          <span key={i} className="text-[#2EBD6B] text-sm">★</span>
                        ))}
                        {[...Array(2)].map((_, i) => (
                          <span key={i} className="text-gray-600 text-sm">★</span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Completed • Last rental: Feb 2026</p>
                    </div>
                    <span className="px-2 py-1 bg-gray-700/40 text-gray-400 text-xs rounded">Completed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Callout Bullets */}
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Every renter's full history in one place</h3>
                  <p className="mt-2 text-gray-400">How many times they've rented, their star rating, past due dates, and contact info — all instantly accessible.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Flag unreliable renters, protect your fleet</h3>
                  <p className="mt-2 text-gray-400">Automatic flagging for late payments. Avoid repeat problem renters before they damage your cars.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">See who your best customers are</h3>
                  <p className="mt-2 text-gray-400">Identify your most reliable renters so you can give them perks, discounts, or priority access to new vehicles.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Payments & Collections */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Automated Payments & Collections
          </h2>
          <p className="text-gray-400 mb-12 max-w-2xl">
            Collect payment on time, every time. Automated reminders and late fees mean less chasing, more revenue.
          </p>

          <div className="grid gap-12 lg:grid-cols-2 items-start">
            {/* Payments List Mockup */}
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              {/* Browser Chrome */}
              <div className="bg-[#0c0c1c] border-b border-white/10 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/60"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/60"></div>
                </div>
                <span className="text-xs text-gray-500 ml-3">pcrbooking.com/payments</span>
              </div>

              <div className="bg-[#0c0c1c] p-6 space-y-3">
                {/* Payment 1 */}
                <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg hover:bg-white/5">
                  <div className="flex-1">
                    <p className="font-semibold text-white">Marcus Johnson</p>
                    <p className="text-xs text-gray-400">Week of Apr 7</p>
                  </div>
                  <p className="font-semibold text-[#2EBD6B]">$350</p>
                  <span className="ml-4 text-green-400">✅ Paid</span>
                </div>

                {/* Payment 2 */}
                <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg hover:bg-white/5">
                  <div className="flex-1">
                    <p className="font-semibold text-white">Darius Williams</p>
                    <p className="text-xs text-gray-400">Week of Apr 7</p>
                  </div>
                  <p className="font-semibold text-[#2EBD6B]">$325</p>
                  <span className="ml-4 text-green-400">✅ Paid</span>
                </div>

                {/* Payment 3 - Overdue */}
                <div className="flex items-center justify-between p-4 border border-red-500/20 rounded-lg hover:bg-red-500/5">
                  <div className="flex-1">
                    <p className="font-semibold text-white">Andre Thompson</p>
                    <p className="text-xs text-gray-400">Week of Apr 7</p>
                  </div>
                  <p className="font-semibold text-[#2EBD6B]">$295</p>
                  <span className="ml-4 text-orange-400">⚠️ 3 Days Overdue</span>
                </div>
                <p className="text-xs text-gray-500 px-4">SMS Reminder Sent • Auto-escalate in 24hrs</p>

                {/* Payment 4 - Upcoming */}
                <div className="flex items-center justify-between p-4 border border-white/10 rounded-lg hover:bg-white/5">
                  <div className="flex-1">
                    <p className="font-semibold text-white">Keisha Brown</p>
                    <p className="text-xs text-gray-400">Week of Apr 14</p>
                  </div>
                  <p className="font-semibold text-[#2EBD6B]">$350</p>
                  <span className="ml-4 text-blue-400">🔵 Upcoming</span>
                </div>
              </div>
            </div>

            {/* Callout Bullets */}
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Automated SMS reminders before payments are due</h3>
                  <p className="mt-2 text-gray-400">Renters get a text 24 hours before payment is due. Most pay on time without you lifting a finger.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Late payment sequences run automatically</h3>
                  <p className="mt-2 text-gray-400">First reminder on day 1. Second reminder on day 3. Auto-escalation to phone call if still unpaid — you don't touch it.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Late fees calculated and charged automatically</h3>
                  <p className="mt-2 text-gray-400">No manual calculation. Late fee thresholds you set trigger automatically. Money flows to you.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Digital Rental Agreements */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-[#0c0c1c]">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Digital Rental Agreements
          </h2>
          <p className="text-gray-400 mb-12 max-w-2xl">
            Renters sign electronically. Timestamped, secured, and stored forever. No printing. No scanning. No lost papers.
          </p>

          <div className="grid gap-12 lg:grid-cols-2 items-start">
            {/* Document Mockup */}
            <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="bg-white p-12 space-y-8 min-h-[500px]">
                {/* Document Header */}
                <div className="text-center border-b border-gray-200 pb-8">
                  <h2 className="text-3xl font-bold text-gray-900">PCR Booking</h2>
                  <p className="text-gray-600 mt-2">Rental Agreement</p>
                </div>

                {/* Agreement Content */}
                <div className="space-y-4 text-gray-700 text-sm leading-relaxed">
                  <p>
                    <strong>Renter:</strong> Marcus Johnson
                  </p>
                  <p>
                    <strong>Vehicle:</strong> 2022 Honda Accord | Plate: GHT-4421
                  </p>
                  <p>
                    <strong>Rental Period:</strong> April 7, 2026 - April 14, 2026
                  </p>
                  <p>
                    <strong>Amount:</strong> $350.00
                  </p>

                  <div className="pt-4 border-t border-gray-200">
                    <p>
                      I acknowledge that I have read and agree to all terms and conditions outlined in this rental agreement...
                    </p>
                  </div>
                </div>

                {/* Signature Line */}
                <div className="pt-8 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl text-green-500">✓</span>
                    <div>
                      <p className="font-semibold text-gray-900">Signed electronically</p>
                      <p className="text-xs text-gray-500">Apr 8, 2026 at 2:34 PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Callout Bullets */}
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Renters sign agreements digitally — no printing</h3>
                  <p className="mt-2 text-gray-400">Agreement auto-sent when booking is confirmed. Renter signs with one click on their phone. Done.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Timestamped and stored securely</h3>
                  <p className="mt-2 text-gray-400">Every signature has a timestamp. Every agreement is backed up to the cloud. You can't lose it.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B]/20">
                  <Check className="h-4 w-4 text-[#2EBD6B]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Auto-sent when booking is confirmed</h3>
                  <p className="mt-2 text-gray-400">You don't chase anyone down. Agreements go out automatically. You're protected from day one.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-4 py-24 sm:px-6 lg:px-8 bg-[#0c0c1c]">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to run your rental business the right way?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-400 text-lg">
            Join operators who've stopped using spreadsheets and started growing.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/auth/signup">
              <Button className="h-12 px-8 text-base font-semibold bg-[#2EBD6B] text-white hover:bg-[#1a9952]">
                Start Free — No Credit Card
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                variant="outline"
                className="h-12 border-2 border-[#2EBD6B] px-8 text-base font-semibold text-[#2EBD6B] hover:bg-[#2EBD6B] hover:text-white"
              >
                See Pricing
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-sm text-gray-500">
            Free plan available. Paid plans start at $79/mo.
          </p>
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
                    href="/tour"
                    className="text-sm text-gray-500 hover:text-white"
                  >
                    Product Tour
                  </Link>
                </li>
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
