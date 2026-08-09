/**
 * PATCH /api/inspections/[id]
 * GET  /api/inspections/[id]/signed-urls (via ?signed=true)
 *
 * Allows operators to update inspection fields and retrieve signed photo URLs.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

const BUCKET = "inspections";
const SIGNED_URL_TTL = 60 * 60; // 1 hour

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const operator = await getOperator();
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: inspection, error } = await supabase
      .from("inspections")
      .select("*")
      .eq("id", id)
      .eq("operator_id", operator.id)
      .single();

    if (error || !inspection) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Generate signed URLs for photo_paths if requested
    const url = new URL(request.url);
    if (url.searchParams.get("signed") === "true") {
      const paths: string[] = Array.isArray(inspection.photo_paths)
        ? inspection.photo_paths
        : [];

      const signedUrls: string[] = [];
      for (const path of paths) {
        try {
          const { data } = await adminSupabase.storage
            .from(BUCKET)
            .createSignedUrl(path, SIGNED_URL_TTL);
          if (data?.signedUrl) signedUrls.push(data.signedUrl);
        } catch {
          // Skip failed URLs gracefully
        }
      }
      return NextResponse.json({ ...inspection, signed_photo_urls: signedUrls });
    }

    return NextResponse.json(inspection);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const operator = await getOperator();
    const supabase = await createClient();
    const body = await request.json();

    const updates: Record<string, unknown> = {};

    if (typeof body.mileage === "number") updates.mileage = body.mileage;
    if (typeof body.fuel_level === "string") updates.fuel_level = body.fuel_level;
    if (typeof body.notes === "string") updates.notes = body.notes;
    if (body.checklist !== undefined) updates.checklist = body.checklist;
    if (body.status === "completed" || body.status === "pending") updates.status = body.status;
    // Append new photo paths (merge with existing)
    if (Array.isArray(body.new_photo_paths) && body.new_photo_paths.length > 0) {
      // Fetch current paths first
      const { data: current } = await supabase
        .from("inspections")
        .select("photo_paths")
        .eq("id", id)
        .eq("operator_id", operator.id)
        .single();

      const existing: string[] = Array.isArray(current?.photo_paths)
        ? (current.photo_paths as string[])
        : [];
      updates.photo_paths = [...existing, ...body.new_photo_paths];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("inspections")
      .update(updates)
      .eq("id", id)
      .eq("operator_id", operator.id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Update failed" },
        { status: error ? 500 : 404 }
      );
    }

    return NextResponse.json({ success: true, inspection: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
