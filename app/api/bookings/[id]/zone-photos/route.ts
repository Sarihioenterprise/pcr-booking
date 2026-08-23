/**
 * /api/bookings/[id]/zone-photos
 *
 * Manages 4-zone vehicle inspection photos (front, back, left, right).
 *
 * POST   — upload a single zone photo
 *          multipart/form-data: file, zone (front|back|left|right), type (pickup|return)
 *          Returns { path, signedUrl, zone, type }
 *
 * GET    — retrieve current photo state for both pickup and return
 *          Returns { pickup_photos, return_photos, pickup_inspected, return_inspected }
 *
 * PATCH  — mark an inspection as complete
 *          JSON body: { type: "pickup" | "return" }
 *          Sets pickup_inspected=true + timestamp (or return_inspected)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";
import { randomUUID } from "crypto";

const BUCKET = "inspections";
const SIGNED_URL_TTL = 60 * 60 * 2; // 2 hours
const MAX_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
const VALID_ZONES = ["front", "back", "left", "right"] as const;
const VALID_TYPES = ["pickup", "return"] as const;

type Zone = (typeof VALID_ZONES)[number];
type InspectionType = (typeof VALID_TYPES)[number];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const operator = await getOperator();
    const adminSupabase = createAdminClient();
    const supabase = await createClient();

    // Parse multipart form
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const zone = formData.get("zone") as string | null;
    const type = formData.get("type") as string | null;

    // Validate
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!zone || !VALID_ZONES.includes(zone as Zone)) {
      return NextResponse.json({ error: "zone must be one of: front, back, left, right" }, { status: 400 });
    }
    if (!type || !VALID_TYPES.includes(type as InspectionType)) {
      return NextResponse.json({ error: "type must be pickup or return" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Accepted: JPEG, PNG, WebP, HEIC" }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large. Max 15 MB." }, { status: 400 });
    }

    // Verify booking belongs to operator (safe columns only in case migration 026 not applied)
    let booking: { id: string; pickup_photos?: Record<string, string>; return_photos?: Record<string, string> } | null = null;
    const { data: bWithPhotos, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, pickup_photos, return_photos")
      .eq("id", bookingId)
      .eq("operator_id", operator.id)
      .single();

    if (bookingErr?.message?.includes("column") && bookingErr?.message?.includes("does not exist")) {
      // Migration 026 not yet applied — fall back to id-only query
      const { data: bSafe, error: bSafeErr } = await supabase
        .from("bookings")
        .select("id")
        .eq("id", bookingId)
        .eq("operator_id", operator.id)
        .single();
      if (bSafeErr || !bSafe) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      booking = { id: bSafe.id };
    } else if (bookingErr || !bWithPhotos) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    } else {
      booking = bWithPhotos;
    }

    // Build storage path: {operatorId}/zones/{bookingId}/{type}/{zone}.{ext}
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const storagePath = `${operator.id}/zones/${bookingId}/${type}/${zone}-${randomUUID()}.${ext}`;

    // Upload to storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await adminSupabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: true });

    if (uploadErr) {
      console.error("Zone photo upload error:", uploadErr);
      return NextResponse.json({ error: uploadErr.message || "Upload failed" }, { status: 500 });
    }

    // Merge zone path into booking JSONB column
    const photosColumn = type === "pickup" ? "pickup_photos" : "return_photos";
    const existingPhotos = (booking as Record<string, unknown>)[photosColumn] as Record<string, string> || {};
    const updatedPhotos = { ...existingPhotos, [zone]: storagePath };

    const { error: updateErr } = await supabase
      .from("bookings")
      .update({ [photosColumn]: updatedPhotos, updated_at: new Date().toISOString() })
      .eq("id", bookingId)
      .eq("operator_id", operator.id);

    if (updateErr) {
      // Column may not exist yet (migration 026 pending) — log but don't fail the upload
      // The photo IS in storage; just can't track it in DB yet
      console.warn("Zone photo DB update skipped (migration 026 pending?):", updateErr.message);
    }

    // Generate a short-lived signed URL for immediate display
    const { data: signedData } = await adminSupabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL);

    return NextResponse.json({
      success: true,
      path: storagePath,
      signedUrl: signedData?.signedUrl || null,
      zone,
      type,
    });
  } catch (err) {
    console.error("Zone photo POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const operator = await getOperator();
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, pickup_photos, return_photos, pickup_inspected, return_inspected, pickup_inspected_at, return_inspected_at")
      .eq("id", bookingId)
      .eq("operator_id", operator.id)
      .single();

    if (error || !booking) {
      // If migration 026 not applied, select with new columns fails — fall back to safe query
      if (error?.message?.includes("column") && error?.message?.includes("does not exist")) {
        return NextResponse.json({
          pickup_photos: {},
          return_photos: {},
          pickup_inspected: false,
          return_inspected: false,
          pickup_inspected_at: null,
          return_inspected_at: null,
          migration_pending: true,
        });
      }
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Generate signed URLs for all stored paths
    async function signPhotos(photos: Record<string, string> | null): Promise<Record<string, { path: string; url: string }>> {
      if (!photos || typeof photos !== "object") return {};
      const result: Record<string, { path: string; url: string }> = {};
      for (const [zone, path] of Object.entries(photos)) {
        if (!path) continue;
        try {
          const { data } = await adminSupabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
          result[zone] = { path, url: data?.signedUrl || "" };
        } catch {
          result[zone] = { path, url: "" };
        }
      }
      return result;
    }

    const [pickupSigned, returnSigned] = await Promise.all([
      signPhotos((booking as Record<string, unknown>).pickup_photos as Record<string, string>),
      signPhotos((booking as Record<string, unknown>).return_photos as Record<string, string>),
    ]);

    return NextResponse.json({
      pickup_photos: pickupSigned,
      return_photos: returnSigned,
      pickup_inspected: (booking as Record<string, unknown>).pickup_inspected || false,
      return_inspected: (booking as Record<string, unknown>).return_inspected || false,
      pickup_inspected_at: (booking as Record<string, unknown>).pickup_inspected_at || null,
      return_inspected_at: (booking as Record<string, unknown>).return_inspected_at || null,
    });
  } catch (err) {
    console.error("Zone photo GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const operator = await getOperator();
    const supabase = await createClient();
    const body = await request.json();

    const type = body.type as string;
    if (!VALID_TYPES.includes(type as InspectionType)) {
      return NextResponse.json({ error: "type must be pickup or return" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updates =
      type === "pickup"
        ? { pickup_inspected: true, pickup_inspected_at: now, updated_at: now }
        : { return_inspected: true, return_inspected_at: now, updated_at: now };

    const { data, error } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", bookingId)
      .eq("operator_id", operator.id)
      .select("id, pickup_inspected, return_inspected, pickup_inspected_at, return_inspected_at")
      .single();

    if (error || !data) {
      // If migration 026 not yet applied, return success anyway so UI can complete
      if (error?.message?.includes("column") && error?.message?.includes("does not exist")) {
        console.warn("Migration 026 not yet applied — inspection flag not persisted.", error.message);
        return NextResponse.json({ success: true, migration_pending: true });
      }
      return NextResponse.json({ error: error?.message || "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, booking: data });
  } catch (err) {
    console.error("Zone photo PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
