"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FC]">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <img src="/icon.png" alt="PCR Logo" className="h-12 w-12" />
        </div>
        <div
          className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#2EBD6B] border-t-transparent"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">Signing you in&hellip;</p>
      </div>
    </div>
  );
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient();

      // Carry Stripe session_id through the confirmation flow
      const sessionId = searchParams.get("session_id");
      const code = searchParams.get("code");

      // Parse the URL fragment for implicit-flow tokens
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const tokenType = hashParams.get("type"); // e.g. "magiclink" | "recovery"

      try {
        let sessionEstablished = false;

        if (accessToken && refreshToken) {
          // Fragment / implicit flow (magic links, recovery links from admin API)
          // supabase-js createBrowserClient has detectSessionInUrl: true by default,
          // so it may have already consumed the fragment. Check first to avoid double-consume.
          const { data: existing } = await supabase.auth.getSession();

          if (existing.session) {
            // Already auto-detected by supabase-js on init
            sessionEstablished = true;
          } else {
            // Manually set the session from the fragment
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!error) {
              sessionEstablished = true;
            }
          }

          // Clear tokens from the URL fragment so they don't linger in browser history
          window.history.replaceState(
            null,
            "",
            window.location.pathname + (window.location.search || "")
          );
        } else if (code) {
          // PKCE / authorization-code flow (Google OAuth, email OTP via code)
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            sessionEstablished = true;
          }
        } else {
          // No fragment tokens and no code — check if supabase already has a session
          // (handles the case where detectSessionInUrl consumed the hash before our effect ran)
          const { data: existing } = await supabase.auth.getSession();
          if (existing.session) {
            sessionEstablished = true;
          }
        }

        if (!sessionEstablished) {
          router.replace("/auth/login");
          return;
        }

        // Recovery links: user is authenticated. Send them to the dedicated
        // password-reset screen so they can actually set a new password.
        if (tokenType === "recovery") {
          router.replace("/auth/reset-password");
          return;
        }

        // Determine routing: new users → onboarding, existing operators → dashboard
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/auth/login");
          return;
        }

        const { data: operator } = await supabase
          .from("operators")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!operator) {
          const onboardingUrl = sessionId
            ? `/auth/onboarding?session_id=${sessionId}`
            : "/auth/onboarding";
          router.replace(onboardingUrl);
        } else {
          router.replace("/dashboard");
        }
      } catch {
        router.replace("/auth/login");
      }
    }

    handleCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <LoadingSpinner />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CallbackHandler />
    </Suspense>
  );
}
