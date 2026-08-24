/**
 * ONE-TIME MIGRATION: deliveries table (032_deliveries.sql)
 * Protected by CRON_SECRET.
 *
 * Requires DB_PASSWORD in Vercel env vars (Supabase db password).
 *
 * Run:
 *   curl -X POST https://pcrbooking.com/api/admin/migrate-deliveries \
 *     -H "Authorization: Bearer <CRON_SECRET>"
 */
import { NextRequest, NextResponse } from "next/server";

const DELIVERIES_SQL = `
-- Create ENUMs (idempotent via DO block)
DO $$ BEGIN
  CREATE TYPE delivery_type AS ENUM ('delivery', 'pickup');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS deliveries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id      UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL,
  type             delivery_type NOT NULL DEFAULT 'delivery',
  scheduled_at     TIMESTAMPTZ NOT NULL,
  address          TEXT NOT NULL,
  renter_name      TEXT,
  vehicle_label    TEXT,
  driver_name      TEXT,
  driver_phone     TEXT,
  status           delivery_status NOT NULL DEFAULT 'pending',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deliveries_operator_scheduled_idx ON deliveries(operator_id, scheduled_at);
CREATE INDEX IF NOT EXISTS deliveries_booking_idx ON deliveries(booking_id);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Operators manage their deliveries"
    ON deliveries
    FOR ALL
    USING (operator_id = (SELECT id FROM operators WHERE user_id = auth.uid() LIMIT 1));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION update_deliveries_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deliveries_updated_at ON deliveries;
CREATE TRIGGER deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_deliveries_updated_at();
`;

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbPassword = process.env.DB_PASSWORD;

  if (!supabaseUrl) {
    return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
  }

  if (!dbPassword) {
    return NextResponse.json({
      error: "DB_PASSWORD not set",
      hint: "Add DB_PASSWORD to Vercel env vars (your Supabase database password), then redeploy and call this endpoint again.",
      sql_to_run_manually: DELIVERIES_SQL.trim(),
      manual_steps: [
        "1. Go to https://supabase.com/dashboard/project/ulxweelmckbtsxyvsvkq/sql/new",
        "2. Paste the SQL in sql_to_run_manually",
        "3. Click Run",
      ],
    }, { status: 400 });
  }

  const projectRef = supabaseUrl.replace("https://", "").replace(".supabase.co", "");
  const dbHost = `db.${projectRef}.supabase.co`;

  try {
    const { Pool } = await import("pg");

    const dbUrl = process.env.DATABASE_URL
      || process.env.DIRECT_URL
      || `postgresql://postgres:${dbPassword}@${dbHost}:5432/postgres`;

    const pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });

    const client = await pool.connect();
    try {
      await client.query(DELIVERIES_SQL);

      const verify = await client.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'deliveries'
      `);

      return NextResponse.json({
        success: true,
        deliveries_table_created: verify.rows.length > 0,
        message: "Deliveries migration (032_deliveries.sql) applied successfully",
      });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      error: msg,
      sql_to_run_manually: DELIVERIES_SQL.trim(),
      manual_steps: [
        "Go to https://supabase.com/dashboard/project/ulxweelmckbtsxyvsvkq/sql/new",
        "Paste the SQL above and click Run",
      ],
    }, { status: 500 });
  }
}
