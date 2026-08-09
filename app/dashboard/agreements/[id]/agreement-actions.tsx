"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Copy, Check, RefreshCw, ExternalLink } from "lucide-react";

export function AgreementActions({
  agreementId,
  bookingId,
  currentStatus,
  signToken,
}: {
  agreementId: string;
  bookingId: string;
  currentStatus: string;
  signToken?: string | null;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [localToken, setLocalToken] = useState<string | null>(signToken ?? null);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://pcrbooking.com";

  const signUrl = localToken ? `${baseUrl}/sign/${localToken}` : null;

  async function sendToRenter() {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/agreements/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          resend: currentStatus === "sent",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");

      if (data.sign_token) setLocalToken(data.sign_token);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send agreement");
    } finally {
      setSending(false);
    }
  }

  function copySignLink() {
    if (!signUrl) return;
    navigator.clipboard.writeText(signUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="border-0 bg-white shadow-sm ring-0">
      <CardContent className="p-4 space-y-3">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {/* Send / Resend button */}
          <Button
            onClick={sendToRenter}
            disabled={sending}
            className="gap-2"
            style={{ backgroundColor: "#2EBD6B" }}
          >
            {currentStatus === "sent" ? (
              <>
                <RefreshCw className={`h-4 w-4 ${sending ? "animate-spin" : ""}`} />
                {sending ? "Resending..." : "Resend to Renter"}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {sending ? "Sending..." : "Send for Signature"}
              </>
            )}
          </Button>

          {/* Copy sign link */}
          {signUrl && (
            <Button variant="outline" onClick={copySignLink} className="gap-2">
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Sign Link
                </>
              )}
            </Button>
          )}

          {/* Open sign page */}
          {signUrl && (
            <a
              href={signUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                Preview
              </Button>
            </a>
          )}
        </div>

        {signUrl && (
          <p className="text-xs text-muted-foreground font-mono break-all bg-slate-50 rounded p-2 border">
            {signUrl}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {currentStatus === "sent"
            ? "Renter has been sent an email with the signing link. Click Resend to send another email."
            : 'Clicking "Send for Signature" will email the renter a unique signing link.'}
        </p>
      </CardContent>
    </Card>
  );
}
