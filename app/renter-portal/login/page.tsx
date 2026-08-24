"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const loggedOut = searchParams.get("logged_out") === "1";

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (errorParam === "invalid_token") {
      setError("Your login link has expired or is invalid. Please request a new one.");
    } else if (errorParam === "missing_token") {
      setError("Invalid login link. Please request a new one.");
    }
  }, [errorParam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/renter-portal/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setSent(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-500 mb-1">
          We sent a login link to
        </p>
        <p className="font-medium text-gray-800 mb-4">{email}</p>
        <p className="text-sm text-gray-400 mb-6">
          The link expires in 15 minutes. Check your spam folder if you don&apos;t see it.
        </p>
        <button
          onClick={() => { setSent(false); setEmail(""); }}
          className="text-sm text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Car className="h-7 w-7 text-emerald-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Renter Account</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Enter your email to access your rental history and bookings.
        </p>
      </div>

      {loggedOut && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 text-gray-400 shrink-0" />
          You&apos;ve been signed out.
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-1.5 block">
            Email address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
              required
              autoFocus
              disabled={submitting}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting || !email.trim()}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending link…
            </>
          ) : (
            "Send Login Link"
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-6">
        No password needed — we&apos;ll email you a secure login link.
      </p>
    </>
  );
}

export default function RenterLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-emerald-50/30 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <Suspense fallback={<div className="text-center text-gray-400 text-sm">Loading…</div>}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          <Link href="/" className="hover:text-gray-600">← Back to PCR Booking</Link>
        </p>
      </div>
    </div>
  );
}
