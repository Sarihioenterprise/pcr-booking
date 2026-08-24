"use client";

import { TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PCRLeadsUpsellProps {
  /** Number of PCR Leads-sourced leads this month (source='pcr_leads') */
  pcrLeadsCount?: number;
  /** Number of organic booking-widget leads this month */
  organicCount?: number;
  /** Number of those pcr_leads leads that converted to bookings */
  pcrConversions?: number;
}

export function PCRLeadsUpsell({
  pcrLeadsCount = 0,
  organicCount = 0,
  pcrConversions = 0,
}: PCRLeadsUpsellProps) {
  const hasPcrLeads = pcrLeadsCount > 0;

  if (hasPcrLeads) {
    // Performance state — they're a customer, show value
    return (
      <div className="relative rounded-xl overflow-hidden border border-[#2EBD6B]/40 bg-[#0a1f14]">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2EBD6B]" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 pl-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#2EBD6B]/20 border border-[#2EBD6B]/30">
            <Zap className="h-5 w-5 text-[#2EBD6B]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white leading-snug">
              PCR Leads is working 🎉
            </h3>
            <p className="mt-1 text-sm text-gray-300 leading-relaxed">
              <span className="font-semibold text-[#2EBD6B]">{pcrLeadsCount} new renters</span> from
              PCR Leads campaigns this month
              {organicCount > 0 ? ` vs ${organicCount} organic` : ""}.
              {pcrConversions > 0 && (
                <> <span className="font-semibold text-white">{pcrConversions} converted</span> to bookings.</>
              )}
            </p>
          </div>
          <div className="shrink-0">
            <a
              href="https://pcr-leads-fasttrack.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="sm"
                className="bg-[#2EBD6B] hover:bg-[#1a9952] text-white font-semibold px-5"
              >
                View Campaign
              </Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Pitch state — they have zero pcr_leads leads
  return (
    <div className="relative rounded-xl overflow-hidden border border-[#2EBD6B]/40 bg-[#0a1f14]">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2EBD6B]" />
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 pl-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#2EBD6B]/20 border border-[#2EBD6B]/30">
          <TrendingUp className="h-5 w-5 text-[#2EBD6B]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white leading-snug">
            Add $9,600–$16,000/Month With PCR Leads
          </h3>
          <p className="mt-1 text-sm text-gray-300 leading-relaxed">
            Your booking page is ready.{" "}
            <span className="font-semibold text-white">PCR Leads</span> fills it — managed Facebook ads
            that send qualified renters straight to your fleet. Clients usually get{" "}
            <span className="font-semibold text-[#2EBD6B]">6–10 new bookings per month</span>,
            adding{" "}
            <span className="font-semibold text-[#2EBD6B]">$9,600–$16,000 in monthly revenue</span>.
          </p>
        </div>
        <div className="shrink-0">
          <a
            href="https://pcr-leads-fasttrack.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="sm"
              className="bg-[#2EBD6B] hover:bg-[#1a9952] text-white font-semibold px-5"
            >
              Get More Bookings
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
