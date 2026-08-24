"use client";

import { useState, useEffect, Suspense } from "react";
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
  const [notificationEmail, setNotificationEmail] = useState("");
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
        // Pre-fill notification email with the signed-in user's auth email
        if (user.email) setNotificationEmail(user.email);
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

    // Auto-generate slug from business name
    const slugBase = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "rental";

    // Find a unique slug (check for conflicts)
    let bookingSlug = slugBase;
    for (let attempt = 2; attempt <= 99; attempt++) {
      const { data: existing } = await supabase
        .from("operators")
        .select("id")
        .eq("booking_slug", bookingSlug)
        .maybeSingle();
      if (!existing) break;
      bookingSlug = `${slugBase}-${attempt}`;
    }

    const { data: operator, error: insertError } = await supabase
      .from("operators")
      .insert({
        user_id: resolvedUserId,
        business_name: businessName,
        owner_name: ownerName,
        phone,
        city,
        state,
        booking_slug: bookingSlug,
        business_email: notificationEmail || null,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Fire GHL signup event asynchronously (fire and forget)
    if (operator?.id) {
      fetch("/api/ghl/sync-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId: operator.id,
          businessName,
          ownerName,
          phone,
        }),
      }).catch((err) => console.error("[onboarding] GHL sync failed:", err));
    }

    // Send welcome email asynchronously (fire and forget — never block onboarding)
    const welcomeRecipient = notificationEmail;
    if (welcomeRecipient) {
      const dashboardUrl = `${window.location.origin}/dashboard`;
      const welcomeBody = `
<p>Hey ${ownerName || "there"},</p>
<p>Welcome to PCR Booking — you're officially set up and ready to go. 🎉</p>
<p>Here's what to do first:</p>
<ol style="padding-left:20px;">
  <li style="margin-bottom:8px;"><strong>Add your first vehicle</strong> — head to Fleet in your dashboard and click "Add Vehicle". Add your rates, photos, and availability.</li>
  <li style="margin-bottom:8px;"><strong>Share your booking page</strong> — your public booking page is live at <a href="https://pcrbooking.com/book/${bookingSlug}" style="color:#2EBD6B;">pcrbooking.com/book/${bookingSlug}</a>. Share it with renters or embed it on your site.</li>
  <li style="margin-bottom:8px;"><strong>Create your first booking</strong> — once your fleet is set up, bookings flow in automatically. You can also create manual bookings from the dashboard.</li>
</ol>
<p>Your 14-day free trial is active — explore everything with zero pressure.</p>
<p><a href="${dashboardUrl}" style="display:inline-block;background:#2EBD6B;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin:8px 0;">Go to My Dashboard →</a></p>
<p style="color:#6b7280;font-size:14px;">Questions? Reply to this email or reach us at <a href="mailto:support@pcrbooking.com" style="color:#2EBD6B;">support@pcrbooking.com</a>.</p>
<p>— The PCR Booking Team</p>
      `;
      fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: welcomeRecipient,
          subject: "Welcome to PCR Booking — you're all set",
          body: welcomeBody.trim(),
          templateType: "welcome",
        }),
      }).catch((err) => console.error("[onboarding] Welcome email failed:", err));
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
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notification-email">
                  Notification email
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(where booking alerts are sent)</span>
                </Label>
                <Input
                  id="notification-email"
                  type="email"
                  placeholder="you@example.com"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
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
