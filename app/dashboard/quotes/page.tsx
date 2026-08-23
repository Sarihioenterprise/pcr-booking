"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Send,
  MoreHorizontal,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Trash2,
} from "lucide-react";

type QuoteStatus = "draft" | "pending" | "sent" | "accepted" | "declined" | "expired";

interface Quote {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  pickup_date: string;
  return_date: string;
  duration_days: number;
  total: number;
  status: QuoteStatus;
  sent_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  created_at: string;
  vehicles: { make: string; model: string; year: number } | null;
  renters: { name: string } | null;
}

const statusConfig: Record<QuoteStatus, { label: string; class: string; icon: React.ReactNode }> = {
  draft:    { label: "Draft",    class: "bg-slate-500/10 text-slate-600 border-slate-300",     icon: <FileText className="h-3 w-3" /> },
  pending:  { label: "Pending",  class: "bg-amber-500/10 text-amber-600 border-amber-300",     icon: <Clock className="h-3 w-3" /> },
  sent:     { label: "Sent",     class: "bg-blue-500/10 text-blue-600 border-blue-300",        icon: <Mail className="h-3 w-3" /> },
  accepted: { label: "Accepted", class: "bg-emerald-500/10 text-emerald-600 border-emerald-300", icon: <CheckCircle2 className="h-3 w-3" /> },
  declined: { label: "Declined", class: "bg-red-500/10 text-red-600 border-red-300",          icon: <XCircle className="h-3 w-3" /> },
  expired:  { label: "Expired",  class: "bg-slate-500/10 text-slate-400 border-slate-200",    icon: <Clock className="h-3 w-3" /> },
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchQuotes();
  }, []);

  async function fetchQuotes() {
    setLoading(true);
    const res = await fetch("/api/quotes");
    if (res.ok) {
      const data = await res.json();
      setQuotes(data);
    }
    setLoading(false);
  }

  async function sendQuote(quoteId: string) {
    setSending(quoteId);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/send`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setQuotes((prev) =>
          prev.map((q) => (q.id === quoteId ? { ...q, status: "sent", sent_at: new Date().toISOString() } : q))
        );
        alert(`Quote sent! ${data.email_sent ? "Email delivered." : ""} ${data.sms_sent ? "SMS delivered." : ""}`);
      } else {
        alert(data.error || "Failed to send quote");
      }
    } finally {
      setSending(null);
    }
  }

  async function deleteQuote(quoteId: string) {
    if (!confirm("Delete this quote? This cannot be undone.")) return;
    setDeleting(quoteId);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, { method: "DELETE" });
      if (res.ok) {
        setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      }
    } finally {
      setDeleting(null);
    }
  }

  async function updateStatus(quoteId: string, status: QuoteStatus) {
    const res = await fetch(`/api/quotes/${quoteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setQuotes((prev) => prev.map((q) => (q.id === quoteId ? { ...q, ...updated } : q)));
    }
  }

  const stats = {
    total: quotes.length,
    sent: quotes.filter((q) => q.status === "sent").length,
    accepted: quotes.filter((q) => q.status === "accepted").length,
    pending: quotes.filter((q) => q.status === "pending").length,
  };

  if (loading) return <div className="text-muted-foreground p-6">Loading quotes…</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quotes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Send rental quotes to prospective customers before they commit.
          </p>
        </div>
        <Link href="/dashboard/quotes/new">
          <Button style={{ backgroundColor: "#2EBD6B" }}>
            <Plus className="h-4 w-4 mr-2" />
            New Quote
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Pending", value: stats.pending, color: "text-amber-600" },
          { label: "Sent", value: stats.sent, color: "text-blue-600" },
          { label: "Accepted", value: stats.accepted, color: "text-emerald-600" },
        ].map((s) => (
          <Card key={s.label} className="border-0 bg-white shadow-sm ring-0">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      {quotes.length === 0 ? (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No quotes yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first quote to send to a potential customer.
            </p>
            <Link href="/dashboard/quotes/new">
              <Button style={{ backgroundColor: "#2EBD6B" }}>
                <Plus className="h-4 w-4 mr-2" />
                New Quote
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => {
                  const cfg = statusConfig[quote.status];
                  const isExpired =
                    quote.expires_at && new Date(quote.expires_at) < new Date() && quote.status === "sent";
                  const vehicleLabel = quote.vehicles
                    ? `${quote.vehicles.year} ${quote.vehicles.make} ${quote.vehicles.model}`
                    : "No vehicle";
                  const customerLabel =
                    quote.customer_name || quote.renters?.name || quote.customer_email || "—";

                  return (
                    <TableRow key={quote.id} className={deleting === quote.id ? "opacity-50" : ""}>
                      <TableCell>
                        <div className="font-medium">{customerLabel}</div>
                        {quote.customer_email && (
                          <div className="text-xs text-muted-foreground">{quote.customer_email}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{vehicleLabel}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {quote.pickup_date} → {quote.return_date}
                        <div className="text-xs">{quote.duration_days}d</div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${Number(quote.total).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`flex items-center gap-1 w-fit ${cfg.class}`}
                        >
                          {cfg.icon}
                          {isExpired ? "Expired" : cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {quote.expires_at
                          ? new Date(quote.expires_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Send button — only for pending/draft quotes with contact info */}
                          {["pending", "draft"].includes(quote.status) &&
                            (quote.customer_email || quote.customer_phone) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendQuote(quote.id)}
                                disabled={sending === quote.id}
                              >
                                <Send className="h-3.5 w-3.5 mr-1" />
                                {sending === quote.id ? "Sending…" : "Send"}
                              </Button>
                            )}

                          <DropdownMenu>
                            {/* @ts-expect-error radix asChild prop type mismatch */}
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {quote.status === "sent" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => updateStatus(quote.id, "accepted")}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
                                    Mark Accepted
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => updateStatus(quote.id, "declined")}
                                  >
                                    <XCircle className="h-4 w-4 mr-2 text-red-500" />
                                    Mark Declined
                                  </DropdownMenuItem>
                                </>
                              )}
                              {["sent"].includes(quote.status) && (
                                <DropdownMenuItem onClick={() => sendQuote(quote.id)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Resend Quote
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => deleteQuote(quote.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
