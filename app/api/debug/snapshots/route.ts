import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const hdrs = await headers()
  const uid  = hdrs.get('x-uid')
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: snaps, error } = await supabase
    .from('usage_snapshots')
    .select('*')
    .eq('client_id', uid)
    .gte('snapped_at', since14d)
    .order('snapped_at', { ascending: true })

  const { data: proxies } = await supabase
    .from('proxies')
    .select('id, username, used_gb, assigned_to')
    .eq('assigned_to', uid)

  return NextResponse.json({ uid, snaps, proxies, error })
}
