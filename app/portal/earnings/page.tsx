"use client";

import { EarningsEstimator } from "@/components/earnings-estimator";

export default function EarningsPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#F8F9FC" }}
    >
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2EBD6B] text-white text-xs font-bold">
              PCR
            </div>
            <span className="font-semibold text-[#0c0c1c]">PCR Booking</span>
          </div>
          <a
            href="/"
            className="text-sm font-medium text-[#2EBD6B] hover:text-[#1a9952] transition-colors"
          >
            Back to site
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#0c0c1c] mb-2">
            How much could you earn?
          </h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Use our earnings estimator to see potential Uber and Lyft earnings
            in your city with different vehicle types.
          </p>
        </div>

        <EarningsEstimator />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-4">
        <p className="text-center text-xs text-gray-400">
          PCR Booking. Estimates are for informational purposes only.
        </p>
      </footer>
    </div>
  );
}
