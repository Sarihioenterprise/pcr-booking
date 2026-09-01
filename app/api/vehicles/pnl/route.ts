import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Resolve operator record for this user
  const { data: operator, error: opError } = await supabase
    .from('operators')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (opError || !operator) {
    return NextResponse.json({ error: 'Operator not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('vehicle_pnl_summary')
    .select('*')
    .eq('operator_id', operator.id)
    .order('net_profit', { ascending: true })

  if (error) {
    console.error('vehicle_pnl_summary query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
