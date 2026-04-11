"use client";

import { useState, useEffect } from "react";
import { X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PCRLeadsUpsellProps {
  operatorCreatedAt?: string;
  bookingsLast30Days?: number;
}

export function PCRLeadsUpsell({
  operatorCreatedAt,
  bookingsLast30Days = 0,
}: PCRLeadsUpsellProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem("pcr-leads-upsell-dismissed");
    if (dismissed === "true") {
      setIsLoading(false);
      return;
    }

    let shouldShow = false;

    if (operatorCreatedAt) {
      const createdDate = new Date(operatorCreatedAt);
      const now = new Date();
      const daysSinceCreation =
        (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 7) {
        shouldShow = true;
      }
    }

    if (bookingsLast30Days === 0) {
      shouldShow = true;
    }

    setIsVisible(shouldShow);
    setIsLoading(false);
  }, [operatorCreatedAt, bookingsLast30Days]);

  const handleDismiss = () => {
    localStorage.setItem("pcr-leads-upsell-dismissed", "true");
    setIsVisible(false);
  };

  if (isLoading || !isVisible) {
    return null;
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-[#2EBD6B]/40 bg-[#0a1f14]">
      {/* Solid green left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2EBD6B]" />

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 pl-6">
        {/* Icon */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#2EBD6B]/20 border border-[#2EBD6B]/30">
          <TrendingUp className="h-5 w-5 text-[#2EBD6B]" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white leading-snug">
            Want More Bookings?
          </h3>
          <p className="mt-1 text-sm text-gray-300 leading-relaxed">
            Let <span className="font-semibold text-white">PCR Leads</span> run Google & Facebook ads for your rental business.
            Operators using our ads see{" "}
            <span className="font-semibold text-[#2EBD6B]">3–5x more bookings</span>.
          </p>
        </div>

        {/* CTA + Dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://join.pcrleads.com?ref=pcrbooking"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto"
          >
            <Button
              size="sm"
              className="w-full sm:w-auto bg-[#2EBD6B] hover:bg-[#1a9952] text-white font-semibold px-5"
            >
              Get More Bookings
            </Button>
          </a>
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-white/10 rounded transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
