"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

interface CollectionsGateProps {
  operatorPlan: string;
}

export function CollectionsGate({ operatorPlan }: CollectionsGateProps) {
  const router = useRouter();
  const isFree = operatorPlan === "free";

  if (!isFree) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Collections</h1>
        <p className="text-sm text-white/50 mt-1">Track and manage overdue payments</p>
      </div>

      <Card className="bg-gradient-to-br from-white/10 to-white/5 border-[#2EBD6B]/30">
        <CardContent className="pt-12 pb-12">
          <div className="text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2EBD6B]/10 mx-auto mb-6">
              <Lock className="h-8 w-8 text-[#2EBD6B]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Automated Collections
            </h2>
            <p className="text-gray-300 mb-8 max-w-md mx-auto text-base">
              Upgrade to Growth to stop chasing late payments — automated SMS reminders and late fee charging run themselves.
            </p>
            <Button
              size="lg"
              className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
              onClick={() => router.push("/onboarding/plan")}
            >
              Upgrade to Growth — $79/mo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
