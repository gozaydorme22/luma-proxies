import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const hdrs = await headers()
  const uid  = hdrs.get('x-uid')
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  const [clientRes, proxiesRes] = await Promise.all([
    supabase.from('clients').select('name,tier').eq('id', uid).single(),
    supabase
      .from('proxies')
      .select('id,label,proxy_type,country,host,port,username,password,gb_limit,used_gb,status,sold_at,created_at')
      .eq('assigned_to', uid)
      .order('sold_at', { ascending: false }),
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

  const client = clientRes.data ?? { name: null, tier: 'bronze' }
  const totalRemainingGb = proxies.reduce((sum, p) => sum + Math.max(0, p.totalGb - p.usedGb), 0)

  return NextResponse.json({ proxies, client, totalRemainingGb })
}
