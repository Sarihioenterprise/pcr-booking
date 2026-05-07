"use client";

import { useState, useEffect, Suspense, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

function OnboardingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSessionId = searchParams.get("session_id") ?? "";

  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Verify session on mount — retry up to 3x to handle cookie propagation delay
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 3;
    const delay = 800; // ms between retries

    async function checkSession() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setSessionChecked(true);
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkSession, delay);
      } else {
        // Session truly not found after retries — redirect to login
        router.replace("/auth/login?message=Session+expired.+Please+sign+in+again.");
      }
    }

    checkSession();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // Re-check user in case session expired mid-form
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login?message=Session+expired.+Please+sign+in+again.");
        setLoading(false);
        return;
      }
      resolvedUserId = user.id;
    }

    const { error: insertError } = await supabase.from("operators").insert({
      user_id: resolvedUserId,
      business_name: businessName,
      owner_name: ownerName,
      phone,
      city,
      state,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Check if there's a Stripe session to link — URL param takes priority over sessionStorage
    const stripeSessionId = urlSessionId || sessionStorage.getItem("stripe_session_id");

    if (stripeSessionId) {
      try {
        const res = await fetch("/api/billing/link-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: stripeSessionId }),
        });

        if (res.ok) {
          sessionStorage.removeItem("stripe_session_id");
          router.push("/dashboard");
          return;
        } else {
          const data = await res.json();
          console.error("[onboarding] link-subscription failed:", data.error);
          // Still push to dashboard — Stripe webhook will link the sub async
          router.push("/dashboard");
          return;
        }
      } catch (err) {
        console.error("[onboarding] link-subscription error:", err);
        // Still push to dashboard — Stripe webhook will link the sub async
        router.push("/dashboard");
        return;
      }
    }

    // FREE plan users go to dashboard onboarding wizard
    router.push("/dashboard/onboarding");
  }

  // Show spinner while verifying session
  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FC]">
        <p className="text-sm text-muted-foreground animate-pulse">Setting up your account…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FC] px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#080812]">
            PCR Booking
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Private Car Rental Booking Platform
          </p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Set up your business</CardTitle>
            <CardDescription>
              Tell us about your rental car operation so we can personalize your
              experience.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="business-name">Business name</Label>
                <Input
                  id="business-name"
                  type="text"
                  placeholder="e.g. City Car Rentals"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="owner-name">Owner name</Label>
                <Input
                  id="owner-name"
                  type="text"
                  placeholder="Your full name"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Business logo (optional)</Label>
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 text-sm text-muted-foreground">
                  Logo upload coming soon
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2EBD6B] text-white hover:bg-[#2EBD6B]/90"
                size="lg"
              >
                {loading ? "Setting up..." : "Complete setup"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FC]">
        <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
      </div>
    }>
      <OnboardingPageInner />
    </Suspense>
  );
}
