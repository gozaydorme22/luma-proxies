import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { listSubAccounts, kbToGb, mgmtUsername } from '@/lib/smartproxy'

export async function POST(req: NextRequest) {
  if (req.headers.get('x-role') !== 'admin')
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  if (!process.env.SMARTPROXY_SESSION_TOKEN)
    return NextResponse.json({ synced: false, reason: 'no_token' })

  const supabase = createServerClient()

  const { data: proxies } = await supabase
    .from('proxies')
    .select('id, username, used_gb, assigned_to')
    .eq('status', 'sold')

  if (!proxies || proxies.length === 0)
    return NextResponse.json({ synced: true, updated: 0 })

  try {
    const subAccounts = await Promise.race([
      listSubAccounts(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SmartProxy timeout')), 12000)
      ),
    ])

    const usageMap = new Map<string, number>(
      subAccounts.map(u => [u.username, kbToGb(u.usage_flow ?? 0)])
    )

    let updated = 0
    const now = new Date().toISOString()

    for (const proxy of proxies) {
      const lookupKey  = mgmtUsername(proxy.username)
      const realUsedGb = usageMap.get(lookupKey)
      if (realUsedGb === undefined) continue
      if (realUsedGb === Number(proxy.used_gb)) continue

      await supabase.from('proxies').update({ used_gb: realUsedGb }).eq('id', proxy.id)

      if (proxy.assigned_to) {
        const { count: priorCount } = await supabase
          .from('usage_snapshots')
          .select('id', { count: 'exact', head: true })
          .eq('proxy_id', proxy.id)
          .eq('client_id', proxy.assigned_to)

        if ((priorCount ?? 0) === 0 && realUsedGb > 0) {
          const baseline = new Date(Date.now() - 5 * 60 * 1000).toISOString()
          await supabase.from('usage_snapshots').insert({
            proxy_id: proxy.id, client_id: proxy.assigned_to, used_gb: 0, snapped_at: baseline,
          })
        }

        await supabase.from('usage_snapshots').insert({
          proxy_id: proxy.id, client_id: proxy.assigned_to, used_gb: realUsedGb, snapped_at: now,
        })
      }

      updated++
    }

    return NextResponse.json({ synced: true, updated })
  } catch (err) {
    console.error('[admin/proxies/sync]', err instanceof Error ? err.message : err)
    return NextResponse.json({ synced: false, reason: 'smartproxy_error' })
  }
}
