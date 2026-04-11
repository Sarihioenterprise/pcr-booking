"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OnboardingChecklistProps {
  hasVehicles: boolean;
}

export default function OnboardingChecklist({
  hasVehicles,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Get user's booking slug from localStorage or use placeholder
  const [bookingSlug, setBookingSlug] = useState("your-slug");

  useEffect(() => {
    setMounted(true);
    const isDismissed = localStorage.getItem("pcr_onboarding_v1");
    setDismissed(isDismissed === "dismissed");

    // Try to get booking slug from localStorage (if stored elsewhere in the app)
    const slug = localStorage.getItem("pcr_booking_slug") || "your-slug";
    setBookingSlug(slug);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("pcr_onboarding_v1", "dismissed");
    setDismissed(true);
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted || dismissed) {
    return null;
  }

  const steps = [
    {
      title: "Add your first vehicle",
      href: "/dashboard/fleet/new",
      completed: hasVehicles,
    },
    {
      title: "Set up your booking widget",
      href: "/dashboard/settings/widget",
      completed: false,
    },
    {
      title: "Share your booking link",
      text: `Share pcrbooking.com/book/${bookingSlug} with renters`,
      completed: false,
      isLink: false,
    },
    {
      title: "Get your first booking",
      href: "/dashboard/bookings",
      completed: false,
    },
  ];

  return (
    <Card className="border-0 bg-white shadow-sm ring-0 mb-8">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold text-gray-900">
          Get Started with PCR Booking
        </CardTitle>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="flex-shrink-0 pt-0.5">
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-[#2EBD6B]" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {step.isLink === false ? (
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {step.title}
                    </p>
                    <p className="text-sm text-gray-600">{step.text}</p>
                  </div>
                ) : (
                  <Link href={step.href || "#"}>
                    <p className="text-sm font-medium text-gray-900 hover:text-[#2EBD6B] transition-colors">
                      {step.title}
                    </p>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
