import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Pool } from 'pg'

// One-time migration endpoint — protected by CRON_SECRET
// Vercel injects DATABASE_URL from the Supabase integration
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!dbUrl) {
    return NextResponse.json({ error: 'No DATABASE_URL found. Check Vercel env vars.' }, { status: 500 })
  }

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

  const migrations = [
    '026_booking_wizard_fields.sql',
    '027_payment_request_tokens.sql',
    '028_no_show.sql',
    '029_quotes.sql',
    '030_inspection_flags.sql',
    '031_vehicle_maintenance.sql',
    '032_deliveries.sql',
    '033_renter_portal.sql',
    '034_stripe_charges_enabled.sql',
  ]

  const results: Record<string, string> = {}

  for (const file of migrations) {
    try {
      const sql = readFileSync(
        join(process.cwd(), 'supabase', 'migrations', file),
        'utf8'
      )
      await pool.query(sql)
      results[file] = '✅ applied'
    } catch (e: any) {
      const msg = e.message || String(e)
      // Ignore harmless "already exists" errors
      if (msg.includes('already exists') || msg.includes('42710') || msg.includes('42P07') || msg.includes('42701')) {
        results[file] = '✅ already exists (skipped)'
      } else {
        results[file] = `❌ ${msg.substring(0, 300)}`
      }
    }
  }

  await pool.end()
  return NextResponse.json({ results, dbUrl: dbUrl.substring(0, 40) + '...' })
}
