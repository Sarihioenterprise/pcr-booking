import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function formatICalDate(date: string | Date): string {
  const d = new Date(date)
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params

  const { data: operator, error: opError } = await supabase
    .from('operators')
    .select('id, business_name')
    .eq('calendar_token', token)
    .single()

  if (opError || !operator) {
    return new NextResponse('Not found', { status: 404 })
  }

  const { data: bookings, error: bookError } = await supabase
    .from('bookings')
    .select('id, pickup_date, return_date, renter_name, renter_phone, vehicles(year, make, model)')
    .eq('operator_id', operator.id)
    .in('status', ['confirmed', 'active', 'completed'])
    .order('pickup_date', { ascending: false })
    .limit(200)

  if (bookError) {
    return new NextResponse('Error', { status: 500 })
  }

  const events = (bookings || []).map((b: any) => {
    const vehicle = b.vehicles ? `${b.vehicles.year} ${b.vehicles.make} ${b.vehicles.model}` : 'Vehicle'
    const start = formatICalDate(b.pickup_date)
    const end = formatICalDate(b.return_date)
    const uid = `booking-${b.id}@pcrbooking.com`
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${vehicle} — ${b.renter_name || 'Renter'}`,
      `DESCRIPTION:Renter: ${b.renter_name || 'N/A'}\\nPhone: ${b.renter_phone || 'N/A'}\\nVehicle: ${vehicle}`,
      'END:VEVENT',
    ].join('\r\n')
  })

  const cal = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PCR Booking//Bookings Calendar//EN',
    `X-WR-CALNAME:${operator.business_name || 'PCR Bookings'}`,
    'X-WR-TIMEZONE:America/New_York',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(cal, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="bookings.ics"',
      'Cache-Control': 'no-cache, no-store',
    },
  })
}
