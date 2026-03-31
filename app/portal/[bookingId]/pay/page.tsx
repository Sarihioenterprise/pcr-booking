"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";

interface BookingData {
  id: string;
  total_price: number;
  renter_name: string;
  status: string;
  vehicles?: {
    make: string;
    model: string;
    year: number;
  };
}

export default function PaymentPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);

  // Mock card form state
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardName, setCardName] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/portal/${bookingId}`);
      if (res.ok) {
        const data = await res.json();
        setBooking(data);
      }
      setLoading(false);
    }
    load();
  }, [bookingId]);

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);

    // Simulate payment processing
    // In production, this would create a PaymentIntent via /api/payments/create-intent
    // and confirm it with Stripe Elements
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setPaid(true);
    setProcessing(false);
  }

  if (loading) {
    return (
      <div className="text-muted-foreground text-center py-12">
        Loading payment details...
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-muted-foreground text-center py-12">
        Booking not found
      </div>
    );
  }

  if (paid) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Payment Successful</h2>
            <p className="text-muted-foreground text-center mb-6">
              Your payment of $
              {Number(booking.total_price).toLocaleString()} has been
              processed.
            </p>
            <Link href={`/portal/${bookingId}`}>
              <Button variant="outline">Back to Booking</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/portal/${bookingId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Make Payment</h1>
          <p className="text-muted-foreground">
            Secure payment for your rental
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Card Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePayment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="card-name">Name on Card</Label>
                  <Input
                    id="card-name"
                    placeholder="John Doe"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-number">Card Number</Label>
                  <Input
                    id="card-number"
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry</Label>
                    <Input
                      id="expiry"
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvc">CVC</Label>
                    <Input
                      id="cvc"
                      placeholder="123"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={processing}
                    style={{ backgroundColor: "#2EBD6B" }}
                  >
                    {processing ? (
                      "Processing..."
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Pay ${Number(booking.total_price).toLocaleString()}
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                  <Lock className="h-3 w-3" />
                  Payments are securely processed via Stripe
                </p>
              </form>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {booking.vehicles && (
                <div>
                  <p className="text-muted-foreground">Vehicle</p>
                  <p className="font-medium">
                    {booking.vehicles.year} {booking.vehicles.make}{" "}
                    {booking.vehicles.model}
                  </p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Renter</p>
                <p className="font-medium">{booking.renter_name}</p>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-[#2EBD6B]">
                    ${Number(booking.total_price).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
