"use client";

import { useState } from "react";
import { MessageSquare, Send, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SMSButtonProps {
  phone: string;
  renterName: string;
  bookingId?: string;
}

const TEMPLATES = [
  {
    label: "Payment Reminder",
    message: (name: string) =>
      `Hi ${name}, this is a reminder that your payment is due soon. Please contact us to arrange payment. Thank you!`,
  },
  {
    label: "Booking Confirmation",
    message: (name: string) =>
      `Hi ${name}, your booking has been confirmed! We'll reach out with pickup details. Thank you for choosing us!`,
  },
  {
    label: "Return Reminder",
    message: (name: string) =>
      `Hi ${name}, just a reminder that your rental is due to be returned soon. Please contact us if you need an extension. Thank you!`,
  },
  {
    label: "Custom",
    message: () => "",
  },
];

export function SMSButton({ phone, renterName, bookingId }: SMSButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function selectTemplate(idx: number) {
    setMessage(TEMPLATES[idx].message(renterName));
    setResult(null);
  }

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/notifications/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, message, booking_id: bookingId }),
      });

      if (res.ok) {
        setResult({ type: "success", text: "SMS sent successfully!" });
        setTimeout(() => {
          setOpen(false);
          setMessage("");
          setResult(null);
        }, 1500);
      } else {
        const data = await res.json();
        setResult({ type: "error", text: data.error || "Failed to send SMS" });
      }
    } catch {
      setResult({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
          setResult(null);
          setMessage("");
        }}
      >
        <MessageSquare className="h-4 w-4 mr-1.5" />
        Send SMS
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send SMS to {renterName}</DialogTitle>
            <DialogDescription>
              Sending to {phone}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Templates */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Templates</Label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t, idx) => (
                  <button
                    key={t.label}
                    onClick={() => selectTemplate(idx)}
                    className="text-xs px-2.5 py-1 rounded-full border border-gray-200 hover:border-[#2EBD6B] hover:text-[#2EBD6B] transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <Label htmlFor="sms-message">Message</Label>
              <Textarea
                id="sms-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">{message.length} characters</p>
            </div>

            {/* Result */}
            {result && (
              <div
                className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                  result.type === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {result.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0" />
                )}
                {result.text}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
            >
              {sending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1.5" />
                  Send SMS
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
