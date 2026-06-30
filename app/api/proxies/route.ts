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

      const age      = now - new Date(snaps[i].snapped_at).getTime()
      const bucketIdx = buckets - 1 - Math.floor(age / bucketMs)
      if (bucketIdx >= 0 && bucketIdx < buckets) {
        result[bucketIdx] += delta
      }
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

  const [clientRes, proxiesRes, snapshotsRes] = await Promise.all([
    supabase.from('clients').select('name,tier').eq('id', uid).single(),
    supabase
      .from('proxies')
      .select('id,label,proxy_type,country,host,port,username,password,gb_limit,used_gb,status,sold_at,created_at')
      .eq('assigned_to', uid)
      .order('sold_at', { ascending: false }),
    supabase
      .from('usage_snapshots')
      .select('proxy_id,used_gb,snapped_at')
      .eq('client_id', uid)
      .gte('snapped_at', since14d)
      .order('snapped_at', { ascending: true }),
  ])

  const proxies = (proxiesRes.data ?? []).map((p: any) => ({
    id:        p.id,
    name:      p.label,
    type:      p.proxy_type,
    country:   p.country,
    status:    p.status === 'sold' ? 'ativa' : p.status === 'suspended' ? 'suspensa' : 'inativa',
    host:      p.host,
    port:      p.port,
    proxyUser: p.username,
    proxyPass: p.password,
    totalGb:   Number(p.gb_limit),
    usedGb:    Number(p.used_gb),
    soldAt:    p.sold_at,
  }))

  const snaps = (snapshotsRes.data ?? []) as Snap[]

  const client           = clientRes.data ?? { name: null, tier: 'bronze' }
  const totalRemainingGb = proxies.reduce((sum, p) => sum + Math.max(0, p.totalGb - p.usedGb), 0)

  return NextResponse.json({
    proxies,
    client,
    totalRemainingGb,
    usage14d: buildChartData(snaps, 14, 24 * 60 * 60 * 1000),
    usage7d:  buildChartData(snaps,  7, 24 * 60 * 60 * 1000),
    usage24h: buildChartData(snaps, 24,      60 * 60 * 1000),
  })
}
