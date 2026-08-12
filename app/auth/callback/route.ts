import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Carry Stripe session_id through the confirmation flow so onboarding can link the subscription
  const sessionId = searchParams.get("session_id");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: operator } = await supabase
          .from("operators")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!operator) {
          const onboardingUrl = sessionId
            ? `${origin}/auth/onboarding?session_id=${sessionId}`
            : `${origin}/auth/onboarding`;
          return NextResponse.redirect(onboardingUrl);
        }

        return NextResponse.redirect(`${origin}/dashboard`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`);
}
