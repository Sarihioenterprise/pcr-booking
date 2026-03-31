"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle, Download } from "lucide-react";

interface InvoiceActionsProps {
  invoiceId: string;
  status: string;
}

export function InvoiceActions({ invoiceId, status }: InvoiceActionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [sending, setSending] = useState(false);
  const [marking, setMarking] = useState(false);

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setSending(false);
    }
  }

  async function handleMarkPaid() {
    setMarking(true);
    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);

      if (!error) {
        router.refresh();
      }
    } finally {
      setMarking(false);
    }
  }

  function handleDownloadPdf() {
    // PDF generation would be handled by a dedicated service.
    // For now, trigger a print dialog as a simple PDF export.
    window.print();
  }

  return (
    <div className="flex items-center gap-2">
      {status !== "paid" && status !== "cancelled" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSend}
          disabled={sending}
        >
          <Send className="h-4 w-4 mr-1" />
          {sending ? "Sending..." : "Send to Renter"}
        </Button>
      )}
      {status !== "paid" && status !== "cancelled" && (
        <Button
          size="sm"
          onClick={handleMarkPaid}
          disabled={marking}
          className="bg-[#2EBD6B] hover:bg-[#2EBD6B]/90"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          {marking ? "Saving..." : "Mark as Paid"}
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
        <Download className="h-4 w-4 mr-1" />
        Download PDF
      </Button>
    </div>
  );
}
