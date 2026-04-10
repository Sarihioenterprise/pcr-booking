"use client";

import { useState, useEffect } from "react";
import { X, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    // Check if banner has been dismissed
    const dismissed = localStorage.getItem("pcr-leads-upsell-dismissed");
    if (dismissed === "true") {
      setIsLoading(false);
      return;
    }

    // Check if operator should see the banner
    let shouldShow = false;

    // Check if operator has been active > 7 days
    if (operatorCreatedAt) {
      const createdDate = new Date(operatorCreatedAt);
      const now = new Date();
      const daysSinceCreation =
        (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 7) {
        shouldShow = true;
      }
    }

    // Check if operator has 0 bookings in last 30 days
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
    <Card className="border-[#2EBD6B]/30 bg-gradient-to-r from-[#2EBD6B]/5 to-transparent">
      <div className="p-4 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
          <Rocket className="h-5 w-5 text-[#2EBD6B]" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-white">
            🚀 Want more bookings?
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            Let <strong>PCR Leads</strong> run Google & Facebook ads for your
            rental business. Operators using our ads see{" "}
            <strong>3-5x more bookings</strong>.
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <a href="https://join.pcrleads.com?ref=pcrbooking" target="_blank" rel="noopener noreferrer">
            <Button
              size="sm"
              style={{ backgroundColor: "#2EBD6B" }}
              className="text-white hover:bg-[#1a9952]"
            >
              Get More Bookings →
            </Button>
          </a>
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>
    </Card>
  );
}
