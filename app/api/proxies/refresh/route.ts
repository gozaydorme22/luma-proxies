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
    for (const proxy of proxies) {
      const lookupKey  = mgmtUsername(proxy.username)
      const realUsedGb = usageMap.get(lookupKey)
      if (realUsedGb === undefined) continue
      if (Math.abs(realUsedGb - Number(proxy.used_gb)) < 0.0001) continue

      await supabase
        .from('proxies')
        .update({ used_gb: realUsedGb })
        .eq('id', proxy.id)
      updated++
    }

    return NextResponse.json({ synced: true, updated })
  } catch (err) {
    console.error('[proxies/refresh]', err instanceof Error ? err.message : err)
    return NextResponse.json({ synced: false, reason: 'smartproxy_error' })
  }
}
