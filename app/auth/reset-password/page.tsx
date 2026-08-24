"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/auth/login");
        return;
      }
      setChecking(false);
    }
    checkSession();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.replace("/dashboard"), 2000);
  }

  // Spinner shown while we verify the session
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FC]">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img src="/icon.png" alt="PCR Logo" className="h-12 w-12" />
          </div>
          <div
            className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#2EBD6B] border-t-transparent"
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FC] px-4">
      <div className="w-full max-w-md">
        {/* Logo header — mirrors login page */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <img src="/icon.png" alt="PCR Logo" className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#080812]">
            PCR Booking
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Private Car Rental Booking Platform
          </p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Set new password</CardTitle>
            <CardDescription>
              Choose a strong password for your account.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="py-4 text-center">
                <p className="text-sm font-medium text-[#2EBD6B]">
                  Password updated! Redirecting you to the dashboard&hellip;
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Repeat your new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
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
                  {loading ? "Saving\u2026" : "Set new password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
