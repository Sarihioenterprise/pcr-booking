"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Copy, Check } from "lucide-react";

export function AgreementActions({
  agreementId,
  bookingId,
  currentStatus,
}: {
  agreementId: string;
  bookingId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function sendToRenter() {
    setSending(true);
    await supabase
      .from("rental_agreements")
      .update({
        status: "sent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", agreementId);
    setSending(false);
    router.refresh();
  }

  function copyPortalLink() {
    const url = `${window.location.origin}/portal/${bookingId}/agreement`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="border-0 bg-white shadow-sm ring-0">
      <CardContent className="p-4 flex items-center gap-3">
        {currentStatus === "draft" && (
          <Button
            onClick={sendToRenter}
            disabled={sending}
            className="gap-2"
            style={{ backgroundColor: "#2EBD6B" }}
          >
            <Send className="h-4 w-4" />
            {sending ? "Sending..." : "Send to Renter"}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={copyPortalLink}
          className="gap-2"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied!" : "Copy Portal Link"}
        </Button>
      </CardContent>
    </Card>
  );
}
