/**
 * /quotes/[id]  — public quote view page
 *
 * The [id] here is actually the accept_token (unique per quote).
 * This way the URL is opaque and can be sent safely in email/SMS.
 */
"use client";

import { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Calendar,
  Car,
  DollarSign,
  Clock,
  XCircle,
} from "lucide-react";

interface QuoteData {
  id: string;
  accept_token: string;
  customer_name: string | null;
  pickup_date: string;
  return_date: string;
  duration_days: number;
  base_total: number;
  addon_total: number;
  total: number;
  addons_snapshot: Array<{ name: string; amount: number; pricing_type: string; days?: number }>;
  status: string;
  notes: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  created_booking_id: string | null;
  vehicles: { make: string; model: string; year: number; photo_url: string | null; category: string } | null;
  operators: { business_name: string; logo_url: string | null; brand_color: string | null } | null;
}

export default function PublicQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: token } = use(params);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch quote via API to avoid exposing admin client to browser
    fetch(`/api/quotes/public/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setQuote(data);
      })
      .catch(() => setError("Failed to load quote"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (!quote) return;
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch(`/api/quotes/${quote.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept_token: token }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to accept quote");
        return;
      }

      setAccepted(true);
      setQuote((prev) => prev ? { ...prev, status: "accepted" } : null);
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-muted-foreground">Loading your quote…</div>
      </div>
    );
  }

  if (!quote || error === "Quote not found") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full mx-4 border-0 shadow-lg">
          <CardContent className="flex flex-col items-center py-12">
            <XCircle className="h-12 w-12 text-red-400 mb-4" />
            <h2 className="font-bold text-xl mb-2">Quote Not Found</h2>
            <p className="text-muted-foreground text-center text-sm">
              This quote link is invalid or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const accentColor = quote.operators?.brand_color ?? "#2EBD6B";
  const isExpired = quote.expires_at && new Date(quote.expires_at) < new Date() && quote.status !== "accepted";
  const isDeclined = quote.status === "declined";
  const isAlreadyAccepted = quote.status === "accepted" || accepted;

  const vehicleLabel = quote.vehicles
    ? `${quote.vehicles.year} ${quote.vehicles.make} ${quote.vehicles.model}`
    : "Rental Vehicle";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header bar */}
      <div className="bg-white border-b px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {quote.operators?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={quote.operators.logo_url}
              alt={quote.operators.business_name}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: accentColor }}
            >
              {quote.operators?.business_name?.[0] ?? "R"}
            </div>
          )}
          <span className="font-semibold text-sm">
            {quote.operators?.business_name ?? "Rental Company"}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Accepted state */}
        {isAlreadyAccepted && (
          <Card className="border-0 shadow-lg bg-emerald-50 border-emerald-200">
            <CardContent className="flex flex-col items-center py-10">
              <CheckCircle2 className="h-14 w-14 text-emerald-500 mb-4" />
              <h2 className="font-bold text-xl mb-2 text-emerald-800">Quote Accepted!</h2>
              <p className="text-emerald-700 text-center text-sm max-w-sm">
                Your rental reservation has been created.{" "}
                {quote.operators?.business_name ?? "The rental company"} will be in touch to
                confirm pickup details.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Expired notice */}
        {isExpired && !isAlreadyAccepted && (
          <Card className="border-0 shadow-sm bg-amber-50">
            <CardContent className="flex items-center gap-3 py-4">
              <Clock className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700">
                This quote expired on {new Date(quote.expires_at!).toLocaleDateString()}.
                Contact {quote.operators?.business_name} for an updated quote.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Declined notice */}
        {isDeclined && (
          <Card className="border-0 shadow-sm bg-red-50">
            <CardContent className="flex items-center gap-3 py-4">
              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">This quote has been declined.</p>
            </CardContent>
          </Card>
        )}

        {/* Hero card */}
        <Card className="border-0 shadow-lg overflow-hidden">
          {quote.vehicles?.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={quote.vehicles.photo_url}
              alt={vehicleLabel}
              className="w-full h-48 object-cover"
            />
          )}
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {quote.operators?.business_name} has sent you a rental quote
                </p>
                <h1 className="text-2xl font-bold">{vehicleLabel}</h1>
              </div>
              <Badge
                variant="outline"
                className={
                  quote.status === "accepted"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-50 text-slate-600"
                }
              >
                {quote.status}
              </Badge>
            </div>

            {/* Dates */}
            <div className="flex items-center gap-4 text-sm mb-6 p-3 bg-slate-50 rounded-lg">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>
                <strong>Pickup:</strong> {quote.pickup_date}
              </span>
              <span className="text-muted-foreground">→</span>
              <span>
                <strong>Return:</strong> {quote.return_date}
              </span>
              <Badge variant="outline" className="ml-auto text-xs">
                {quote.duration_days} day{quote.duration_days !== 1 ? "s" : ""}
              </Badge>
            </div>

            {/* Price breakdown */}
            <div className="space-y-2 mb-6">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4" />
                Price Breakdown
              </h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>
                    <Car className="h-3.5 w-3.5 inline mr-1" />
                    {vehicleLabel} × {quote.duration_days} day{quote.duration_days !== 1 ? "s" : ""}
                  </span>
                  <span>${Number(quote.base_total).toFixed(2)}</span>
                </div>

                {Array.isArray(quote.addons_snapshot) &&
                  quote.addons_snapshot.map((addon, i) => (
                    <div key={i} className="flex justify-between text-muted-foreground">
                      <span>{addon.name}</span>
                      <span>${Number(addon.amount).toFixed(2)}</span>
                    </div>
                  ))}

                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span style={{ color: accentColor }}>
                    ${Number(quote.total).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div className="mb-6 p-3 bg-slate-50 rounded-lg text-sm">
                <p className="font-medium mb-1">Note from {quote.operators?.business_name}:</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}

            {/* Validity */}
            {quote.expires_at && !isAlreadyAccepted && !isExpired && (
              <p className="text-xs text-muted-foreground mb-4">
                This quote is valid until{" "}
                <strong>{new Date(quote.expires_at).toLocaleDateString()}</strong>.
              </p>
            )}

            {/* Accept button */}
            {!isAlreadyAccepted && !isExpired && !isDeclined && (
              <>
                {error && (
                  <p className="text-sm text-red-600 mb-3">{error}</p>
                )}
                <Button
                  className="w-full py-6 text-base font-semibold"
                  style={{ backgroundColor: accentColor }}
                  onClick={handleAccept}
                  disabled={accepting}
                >
                  {accepting ? "Processing…" : "Accept Quote & Confirm Booking"}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  By clicking above, you accept these terms and confirm your rental reservation.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
