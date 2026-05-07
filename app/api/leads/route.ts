import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: corsHeaders });
}

// ── Rate Limiting ────────────────────────────────────────────────────────────
// Simple in-memory rate limiter: max 5 leads per IP per 60 seconds
// Note: This resets on serverless cold starts; use Redis/Upstash for persistence
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true; // allowed
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false; // blocked
  }

  entry.count++;
  return true; // allowed
}

// ── UUID validation ──────────────────────────────────────────────────────────
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(val: string): boolean {
  return UUID_REGEX.test(val);
}

// ── Email validation ─────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(val: string): boolean {
  return EMAIL_REGEX.test(val);
}

// ── Phone validation (basic: digits, spaces, dashes, parens, +) ─────────────
const PHONE_REGEX = /^[\d\s\-\+\(\)]{7,20}$/;

function isValidPhone(val: string): boolean {
  return PHONE_REGEX.test(val.trim());
}

export async function POST(request: NextRequest) {
  try {
    // ── Rate Limiting ──────────────────────────────────────────────────────
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { operator_id, name, phone, email, dates_requested, duration_days } =
      body;

    // ── Field Validation ───────────────────────────────────────────────────
    if (!operator_id || !name) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: operator_id, name" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Require at least one of email or phone
    if (!email && !phone) {
      return NextResponse.json(
        { success: false, error: "At least one of email or phone is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate operator_id is a valid UUID
    if (!isValidUUID(operator_id)) {
      return NextResponse.json(
        { success: false, error: "Invalid operator_id format" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate name length
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json(
        { success: false, error: "Name must be between 2 and 100 characters" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate email format if provided
    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate phone format if provided
    if (phone && !isValidPhone(phone)) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number format" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createAdminClient();

    // ── Verify operator exists ─────────────────────────────────────────────
    const { data: operator, error: operatorError } = await supabase
      .from("operators")
      .select("id")
      .eq("id", operator_id)
      .single();

    if (operatorError || !operator) {
      return NextResponse.json(
        { success: false, error: "Operator not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // ── Insert Lead ────────────────────────────────────────────────────────
    const { data, error } = await supabase
      .from("leads")
      .insert({
        operator_id,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim().toLowerCase() || null,
        dates_requested,
        duration_days,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to insert lead:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create lead" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: true, lead_id: data.id },
      { status: 201, headers: corsHeaders }
    );
  } catch (err) {
    console.error("Lead submission error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
