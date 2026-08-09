/**
 * POST /api/inspections/upload
 *
 * Uploads inspection damage photos to the private `inspections` bucket.
 * Accepts multipart/form-data with:
 *   - file: image (max 15 MB)
 *   - operator_id: operator UUID
 *   - inspection_id: optional inspection UUID (for path namespacing)
 *
 * Returns { path } — caller stores path in inspection.photo_paths[].
 * Signed URLs are generated on-demand server-side when viewing.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const BUCKET = "inspections";

export async function POST(request: NextRequest) {
  try {
    // Auth check — operator must be signed in
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const operatorId = formData.get("operator_id") as string | null;
    const inspectionId = formData.get("inspection_id") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!operatorId) {
      return NextResponse.json({ error: "operator_id required" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Accepted: JPEG, PNG, WebP, HEIC" },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum is 15 MB" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const folder = inspectionId || "unsorted";
    const storagePath = `${operatorId}/${folder}/${randomUUID()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      // If bucket doesn't exist yet, return a graceful error
      if (uploadError.message?.includes("not found") || uploadError.message?.includes("does not exist")) {
        return NextResponse.json(
          { error: "Storage bucket not configured yet. Run migration 021 and create the 'inspections' bucket in Supabase." },
          { status: 503 }
        );
      }
      console.error("Inspection photo upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message || "Upload failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, path: storagePath });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    console.error("Inspection upload error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
