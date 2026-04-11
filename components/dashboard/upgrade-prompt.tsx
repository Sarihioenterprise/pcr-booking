"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: string;
  currentPlan: string;
  headline: string;
  body: string;
  upgradeTo: "growth" | "pro" | "scale";
}

export function UpgradePrompt({
  open,
  onOpenChange,
  trigger,
  currentPlan,
  headline,
  body,
  upgradeTo,
}: UpgradePromptProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2EBD6B]/10">
              <AlertCircle className="h-5 w-5 text-[#2EBD6B]" />
            </div>
            <DialogTitle className="text-lg">{headline}</DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-600 mt-2">
            {body}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Maybe Later
          </Button>
          <Button
            className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
            onClick={() => {
              router.push("/onboarding/plan");
              onOpenChange(false);
            }}
          >
            Upgrade to {upgradeTo.charAt(0).toUpperCase() + upgradeTo.slice(1)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
