import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { listSubAccounts, kbToGb, mgmtUsername } from '@/lib/smartproxy'

// Called by the proxy dashboard on page load to sync real usage from SmartProxy
export async function POST() {
  const hdrs = await headers()
  const uid  = hdrs.get('x-uid')
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.SMARTPROXY_SESSION_TOKEN) {
    return NextResponse.json({ synced: false, reason: 'no_token' })
  }

  const supabase = createServerClient()

  const { data: proxies } = await supabase
    .from('proxies')
    .select('id, username, used_gb')
    .eq('assigned_to', uid)
    .eq('status', 'sold')

  if (!proxies || proxies.length === 0) {
    return NextResponse.json({ synced: true, updated: 0 })
  }

  try {
    const subAccounts = await Promise.race([
      listSubAccounts(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SmartProxy timeout')), 8000)
      ),
    ])

    const usageMap = new Map<string, number>(
      subAccounts.map(u => [u.username, kbToGb(u.usage_flow ?? 0)])
    )

    let updated = 0
    const now = new Date().toISOString()
    const snapshots: { proxy_id: string; client_id: string; used_gb: number; snapped_at: string }[] = []

    for (const proxy of proxies) {
      const lookupKey  = mgmtUsername(proxy.username)
      const realUsedGb = usageMap.get(lookupKey)
      if (realUsedGb === undefined) continue

      const usageChanged = realUsedGb !== Number(proxy.used_gb)

      if (usageChanged) {
        await supabase
          .from('proxies')
          .update({ used_gb: realUsedGb })
          .eq('id', proxy.id)
        updated++

        // If no prior snapshots exist and there is usage, insert a zero-baseline
        // 5 minutes before so the delta appears on the chart immediately
        const { count: priorCount } = await supabase
          .from('usage_snapshots')
          .select('id', { count: 'exact', head: true })
          .eq('proxy_id', proxy.id)
          .eq('client_id', uid)

        if ((priorCount ?? 0) === 0 && realUsedGb > 0) {
          const baseline = new Date(Date.now() - 5 * 60 * 1000).toISOString()
          await supabase.from('usage_snapshots').insert({
            proxy_id: proxy.id, client_id: uid, used_gb: 0, snapped_at: baseline,
          })
        }

        snapshots.push({ proxy_id: proxy.id, client_id: uid, used_gb: realUsedGb, snapped_at: now })
      }
    }

    if (snapshots.length > 0) {
      await supabase.from('usage_snapshots').insert(snapshots)
    }

    return NextResponse.json({ synced: true, updated, snapshots: snapshots.length })
  } catch (err) {
    console.error('[proxies/refresh]', err instanceof Error ? err.message : err)
    return NextResponse.json({ synced: false, reason: 'smartproxy_error' })
  }
}
