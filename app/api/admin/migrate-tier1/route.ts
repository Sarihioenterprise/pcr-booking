/**
 * ONE-TIME MIGRATION ENDPOINT — PCR Booking Tier 1
 * Protected by CRON_SECRET. Run once after deploy, then this file can remain
 * (it's idempotent: uses IF NOT EXISTS).
 *
 * Call with:
 *   curl -X POST https://pcrbooking.com/api/admin/migrate-tier1 \
 *     -H "Authorization: Bearer <CRON_SECRET>"
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Missing Supabase credentials" }, { status: 500 });
  }

  // Construct a direct DB connection URL from the Supabase project URL
  // Format: db.[project-ref].supabase.co
  const projectRef = supabaseUrl.replace("https://", "").replace(".supabase.co", "");
  const dbHost = `db.${projectRef}.supabase.co`;

  try {
    // Dynamic import pg to avoid bundling issues (it's a devDependency)
    const { Pool } = await import("pg").catch(() => {
      throw new Error("pg package not available. Run: npm install pg");
    });

    const dbUrl = process.env.DATABASE_URL
      || process.env.DIRECT_URL
      || `postgresql://postgres:${process.env.DB_PASSWORD || ""}@${dbHost}:5432/postgres`;

    const pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });

    const client = await pool.connect();
    try {
      await client.query(`
        ALTER TABLE leads ADD COLUMN IF NOT EXISTS license_file_path TEXT;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_pickup BOOLEAN DEFAULT FALSE;
        ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_return BOOLEAN DEFAULT FALSE;
      `);

      const check = await client.query(`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_name IN ('leads', 'bookings')
          AND column_name IN ('license_file_path', 'reminder_sent_pickup', 'reminder_sent_return')
        ORDER BY table_name, column_name;
      `);

      return NextResponse.json({
        success: true,
        columnsVerified: check.rows,
        message: "Tier 1 schema migration applied successfully",
      });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      error: msg,
      hint: "If DB_PASSWORD is missing, add it to Vercel env vars and redeploy, or run the SQL manually via Supabase Dashboard > SQL Editor using supabase/migrations/016_tier1_features.sql",
      sqlFile: "supabase/migrations/016_tier1_features.sql",
    }, { status: 500 });
  }
}
