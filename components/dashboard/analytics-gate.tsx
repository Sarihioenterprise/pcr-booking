"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface AnalyticsGateProps {
  operatorPlan: string;
  children: React.ReactNode;
}

export function AnalyticsGate({ operatorPlan, children }: AnalyticsGateProps) {
  const router = useRouter();
  const isFree = operatorPlan === "free";

  if (!isFree) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg">
        <div className="text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2EBD6B]/10 mx-auto mb-4">
            <Lock className="h-7 w-7 text-[#2EBD6B]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Unlock Analytics
          </h3>
          <p className="text-sm text-gray-600 mb-6 max-w-sm">
            Upgrade to Growth ($79/mo) to see revenue trends, booking analytics, and vehicle performance.
          </p>
          <Button
            className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
            onClick={() => router.push("/onboarding/plan")}
          >
            Upgrade to Growth
          </Button>
        </div>
      </div>
    </div>
  );
}
