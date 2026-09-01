import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TELEGRAM_BOT_TOKEN = "7618869959:AAEYHv87dExvKBfxkiamPhH_hUm_xqAWsL8";
const TELEGRAM_CHAT_ID = "6619571786";

export async function POST(req: NextRequest) {
  try {
    const { businessName, logoUrl, city, state, vehicles, phone, specialRequests } =
      await req.json();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let operatorEmail = "Unknown";
    if (user) {
      const adminSupabase = createAdminClient();
      const { data: operator } = await adminSupabase
        .from("operators")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (operator) {
        operatorEmail = operator.business_email || user.email || "Unknown";
      }
    }

    const message = `🌐 NEW WEBSITE REQUEST — $497

Business: ${businessName}
City/State: ${city}, ${state}
Phone: ${phone}
Logo: ${logoUrl || "Not provided"}

Vehicles:
${vehicles}

Special Requests: ${specialRequests || "None"}

Operator Email: ${operatorEmail}`;

    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message }),
      }
    );

    if (!tgRes.ok) {
      const err = await tgRes.text();
      return NextResponse.json({ error: `Telegram error: ${err}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}
