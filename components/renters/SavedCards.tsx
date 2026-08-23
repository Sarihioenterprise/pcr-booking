"use client";

/**
 * SavedCards — shows a renter's payment methods on file.
 *
 * Features:
 * - Lists saved cards (brand, last 4, expiry)
 * - "Add Card" flow via Stripe SetupIntent + Stripe.js Elements
 * - Remove card
 * - Charge a specific card (amount + description dialog)
 *
 * Requires: @stripe/stripe-js and @stripe/react-stripe-js (already in deps)
 */

import { useEffect, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Plus,
  Trash2,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

// ─── Card brand icon helper ──────────────────────────────────────────────────

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
  jcb: "JCB",
  unionpay: "UnionPay",
  diners: "Diners",
};

// ─── Add Card form (uses Stripe Elements) ────────────────────────────────────

function AddCardForm({
  renterId,
  onSuccess,
  onCancel,
}: {
  renterId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Create SetupIntent on mount
  useEffect(() => {
    fetch(`/api/renters/${renterId}/payment-methods`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d.client_secret) {
          setClientSecret(d.client_secret);
          setReady(true);
        } else {
          setError(d.error || "Failed to initialize card setup");
        }
      })
      .catch(() => setError("Failed to initialize card setup"));
  }, [renterId]);

  async function handleSave() {
    if (!stripe || !elements || !clientSecret) return;
    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card element not ready");
      setLoading(false);
      return;
    }

    const { error: stripeError } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: cardElement },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Card setup failed");
      setLoading(false);
      return;
    }

    onSuccess();
  }

  return (
    <div className="space-y-4">
      {!ready && !error && (
        <p className="text-sm text-muted-foreground">Initializing secure card input…</p>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {ready && (
        <div className="border rounded-lg p-3 bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#1f2937",
                  "::placeholder": { color: "#9ca3af" },
                },
              },
            }}
          />
        </div>
      )}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={!ready || loading}
          style={{ backgroundColor: "#2EBD6B" }}
        >
          {loading ? "Saving…" : "Save Card"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Charge dialog ───────────────────────────────────────────────────────────

function ChargeDialog({
  open,
  onClose,
  renterId,
  paymentMethodId,
  last4,
  bookingId,
}: {
  open: boolean;
  onClose: () => void;
  renterId: string;
  paymentMethodId: string;
  last4: string;
  bookingId?: string;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [charging, setCharging] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function reset() {
    setAmount("");
    setDescription("");
    setResult(null);
    setErrorMsg(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCharge() {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0 || !description.trim()) return;

    setCharging(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/payments/charge-stored-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          renterId,
          paymentMethodId,
          amount: parsed,
          description: description.trim(),
          bookingId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setResult("success");
      } else {
        setResult("error");
        setErrorMsg(data.error || "Charge failed");
      }
    } catch {
      setResult("error");
      setErrorMsg("Network error. Please try again.");
    } finally {
      setCharging(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Charge Card on File</DialogTitle>
        </DialogHeader>

        {result === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle className="h-12 w-12 text-emerald-500" />
            <p className="font-semibold">Charge successful!</p>
            <p className="text-sm text-muted-foreground">
              ${parseFloat(amount).toFixed(2)} charged to card ending in {last4}.
            </p>
          </div>
        ) : result === "error" ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <XCircle className="h-12 w-12 text-red-500" />
            <p className="font-semibold text-red-700">Charge failed</p>
            <p className="text-sm text-center text-muted-foreground">{errorMsg}</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Charging card ending in <strong>{last4}</strong>.
            </p>
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <Input
                  className="pl-7"
                  type="number"
                  min="0.50"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="e.g., Late return fee, Damage deposit"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {errorMsg && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose}>Close</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose} disabled={charging}>
                Cancel
              </Button>
              <Button
                onClick={handleCharge}
                disabled={charging || !amount || !description.trim()}
                style={{ backgroundColor: "#2EBD6B" }}
              >
                {charging ? "Charging…" : `Charge $${parseFloat(amount || "0").toFixed(2)}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

interface SavedCardsProps {
  renterId: string;
  bookingId?: string;
}

export function SavedCards({ renterId, bookingId }: SavedCardsProps) {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [chargeCard, setChargeCard] = useState<SavedCard | null>(null);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/renters/${renterId}/payment-methods`);
      if (res.ok) {
        const data = await res.json();
        setCards(data);
      }
    } finally {
      setLoading(false);
    }
  }, [renterId]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  async function removeCard(pmId: string) {
    if (!confirm("Remove this card from file? This cannot be undone.")) return;
    setRemovingId(pmId);
    try {
      const res = await fetch(`/api/renters/${renterId}/payment-methods`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });
      if (res.ok) {
        setCards((prev) => prev.filter((c) => c.id !== pmId));
      }
    } finally {
      setRemovingId(null);
    }
  }

  function handleAddSuccess() {
    setShowAdd(false);
    fetchCards();
  }

  return (
    <Card className="border-0 bg-white shadow-sm ring-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Cards on File
          </CardTitle>
          {!showAdd && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Card
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add card form */}
        {showAdd && (
          <div className="border rounded-lg p-4 bg-slate-50">
            <p className="text-sm font-medium mb-3">Enter card details</p>
            <Elements stripe={stripePromise}>
              <AddCardForm
                renterId={renterId}
                onSuccess={handleAddSuccess}
                onCancel={() => setShowAdd(false)}
              />
            </Elements>
          </div>
        )}

        {/* Cards list */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading cards…</p>
        ) : cards.length === 0 && !showAdd ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CreditCard className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No cards on file</p>
            <p className="text-xs text-muted-foreground mt-1">
              Save a card to charge deposits, fees, or damages quickly.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {cards.map((card) => (
              <div
                key={card.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50"
              >
                <CreditCard className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm capitalize">
                      {BRAND_LABELS[card.brand] ?? card.brand} •••• {card.last4}
                    </span>
                    {card.is_default && (
                      <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Expires {String(card.exp_month).padStart(2, "0")}/{card.exp_year}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setChargeCard(card)}
                    className="text-xs"
                  >
                    <DollarSign className="h-3.5 w-3.5 mr-1" />
                    Charge
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeCard(card.id)}
                    disabled={removingId === card.id}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Charge dialog */}
      {chargeCard && (
        <ChargeDialog
          open={!!chargeCard}
          onClose={() => setChargeCard(null)}
          renterId={renterId}
          paymentMethodId={chargeCard.id}
          last4={chargeCard.last4}
          bookingId={bookingId}
        />
      )}
    </Card>
  );
}
