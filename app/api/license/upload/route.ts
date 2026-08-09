/**
 * POST /api/license/upload
 *
 * Server-side license upload endpoint.
 * Accepts multipart/form-data with:
 *   - file: the license image/PDF (max 10 MB)
 *   - operator_id: the operator's UUID
 *   - lead_context: optional string identifier (for path namespacing)
 *
 * Uses the service role key to upload to the private `licenses` bucket.
 * Never exposes the service key to the client.
 *
 * Returns: { path, message }
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const operatorId = formData.get("operator_id") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!operatorId) {
      return NextResponse.json({ error: "operator_id is required" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Accepted: JPEG, PNG, WebP, GIF, PDF" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Generate a unique path: licenses/{operator_id}/{uuid}.{ext}
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const uniqueId = randomUUID();
    const storagePath = `${operatorId}/${uniqueId}.${ext}`;

    // Convert File to Buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("licenses")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("License upload error:", uploadError);
      return NextResponse.json(
        { error: uploadError.message || "Upload failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      path: storagePath,
      message: "License uploaded successfully",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    console.error("License upload error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
