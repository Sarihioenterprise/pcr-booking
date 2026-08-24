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

    // Verify portal access token (same auth as other portal routes)
    const authError = await verifyPortalToken(request, bookingId, supabase);
    if (authError) return authError;

    // Parse multipart form
    const formData = await request.formData();
    const renterName = (formData.get("renter_name") as string)?.trim();
    const licenseNumber = (formData.get("license_number") as string)?.trim() || null;
    const conditionNotes = (formData.get("condition_notes") as string)?.trim() || null;

    if (!renterName) {
      return NextResponse.json({ error: "Renter name is required" }, { status: 400 });
    }

    // Fetch booking to verify it exists and get operator_id
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, operator_id, vehicle_id, status")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status === "active") {
      return NextResponse.json(
        { error: "Booking is already checked in" },
        { status: 409 }
      );
    }

    // Upload zone photos to Supabase Storage
    const zones = ["Front", "Driver_Side", "Rear", "Passenger_Side"] as const;
    const photoUrls: Record<string, string> = {};

    for (const zone of zones) {
      const file = formData.get(`photo_${zone}`) as File | null;
      if (file && file.size > 0) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `checkin/${bookingId}/${zone.toLowerCase()}-${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("vehicle-photos")
          .upload(path, file, { cacheControl: "3600", upsert: true });

        if (!uploadError && uploadData) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("vehicle-photos").getPublicUrl(uploadData.path);
          photoUrls[zone] = publicUrl;
        }
      }
    }

    // Update booking: status → active, save renter info + check-in data
    const checkinPayload: Record<string, unknown> = {
      status: "active",
      renter_name: renterName,
      checked_in_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (licenseNumber) checkinPayload.license_number = licenseNumber;
    if (conditionNotes) checkinPayload.checkin_notes = conditionNotes;
    if (Object.keys(photoUrls).length > 0) {
      checkinPayload.checkin_photos = photoUrls;
    }

    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update(checkinPayload)
      .eq("id", bookingId)
      .select()
      .single();

    if (updateError) {
      // If unknown columns fail, do minimal update
      const { data: minimalUpdate, error: minimalError } = await supabase
        .from("bookings")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .select()
        .single();

      if (minimalError) {
        return NextResponse.json(
          { error: minimalError.message },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        booking: minimalUpdate,
        photos: photoUrls,
      });
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      photos: photoUrls,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
