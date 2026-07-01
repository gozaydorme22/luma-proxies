import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

type Snap = { proxy_id: string; used_gb: number; snapped_at: string }

function buildChartData(snapshots: Snap[], buckets: number, bucketMs: number): number[] {
  const now    = Date.now()
  const result = new Array(buckets).fill(0)

  const byProxy = new Map<string, Snap[]>()
  for (const s of snapshots) {
    const arr = byProxy.get(s.proxy_id) ?? []
    arr.push(s)
    byProxy.set(s.proxy_id, arr)
  }

  for (const snaps of byProxy.values()) {
    snaps.sort((a, b) => new Date(a.snapped_at).getTime() - new Date(b.snapped_at).getTime())
    for (let i = 1; i < snaps.length; i++) {
      const delta = snaps[i].used_gb - snaps[i - 1].used_gb
      if (delta <= 0) continue
      const age       = now - new Date(snaps[i].snapped_at).getTime()
      const bucketIdx = buckets - 1 - Math.floor(age / bucketMs)
      if (bucketIdx >= 0 && bucketIdx < buckets) result[bucketIdx] += delta
    }
  }

  return result
}

export async function GET() {
  const hdrs = await headers()
  const uid  = hdrs.get('x-uid')
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const [proxiesRes, snapshotsRes] = await Promise.all([
    supabase
      .from('proxies')
      .select('id, label, proxy_type, gb_limit, used_gb, status')
      .eq('assigned_to', uid)
      .order('sold_at', { ascending: false }),
    supabase
      .from('usage_snapshots')
      .select('proxy_id, used_gb, snapped_at')
      .eq('client_id', uid)
      .gte('snapped_at', since14d)
      .order('snapped_at', { ascending: true }),
  ])

  const items = (proxiesRes.data ?? []).map((p: any) => ({
    id:      p.id,
    name:    p.label,
    type:    p.proxy_type,
    totalGb: Number(p.gb_limit),
    usedGb:  Number(p.used_gb),
    status:  p.status,
  }))

  const snaps = (snapshotsRes.data ?? []) as Snap[]

  return NextResponse.json({
    proxies:  items,
    usage14d: buildChartData(snaps, 14, 24 * 60 * 60 * 1000),
  })
}
