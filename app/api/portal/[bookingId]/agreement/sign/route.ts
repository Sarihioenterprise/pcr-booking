import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPortalToken } from "@/lib/portal-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const supabase = createAdminClient();

    // Verify portal access token
    const authError = await verifyPortalToken(request, bookingId, supabase);
    if (authError) return authError;

    const body = await request.json();
    const { renter_signature, signature_png_b64 } = body;

    if (!renter_signature) {
      return NextResponse.json(
        { error: "Signature is required" },
        { status: 400 }
      );
    }

    // Find the agreement for this booking
    const { data: agreement, error: findError } = await supabase
      .from("rental_agreements")
      .select("id")
      .eq("booking_id", bookingId)
      .in("status", ["sent", "draft"])
      .single();

    if (findError || !agreement) {
      return NextResponse.json(
        { error: "No agreement found for this booking" },
        { status: 404 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      renter_signature,
      signed_at: new Date().toISOString(),
      status: "signed",
      updated_at: new Date().toISOString(),
    };
    if (signature_png_b64) {
      updatePayload.signature_png_b64 = signature_png_b64;
    }

    const { data, error } = await supabase
      .from("rental_agreements")
      .update(updatePayload)
      .eq("id", agreement.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
