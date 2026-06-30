import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { listSubAccounts, mbToGb } from '@/lib/smartproxy'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

// GET — chamado pelo Vercel Cron a cada 15 minutos
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()

  const { data: proxies, error: fetchErr } = await supabase
    .from('proxies')
    .select('id, label, host, port, username, used_gb, gb_limit, assigned_to, clients(email, name)')
    .eq('status', 'sold')

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  // If SmartProxy API key is set, sync real usage data
  if (process.env.SMARTPROXY_APP_KEY) {
    try {
      const subAccounts = await listSubAccounts()
      const usageMap = new Map<string, number>(
        subAccounts.map(u => [u.username, mbToGb(u.flow_used ?? 0)])
      )

      for (const proxy of proxies ?? []) {
        const realUsedGb = usageMap.get(proxy.username)
        if (realUsedGb === undefined) continue

        // Update used_gb from API
        await supabase
          .from('proxies')
          .update({ used_gb: realUsedGb })
          .eq('id', proxy.id)
      }
    } catch (err) {
      console.error('[cron] SmartProxy sync failed:', err)
      // Fall through — still run the suspension check on DB values
    }
  }

  // Re-fetch with updated values
  const { data: refreshed } = await supabase
    .from('proxies')
    .select('id, label, host, port, username, used_gb, gb_limit, assigned_to, clients(email, name)')
    .eq('status', 'sold')

  const toSuspend = (refreshed ?? []).filter((p: any) => Number(p.used_gb) >= Number(p.gb_limit))

  let suspended = 0
  const results: string[] = []

  for (const proxy of toSuspend) {
    const { error: suspErr } = await supabase
      .from('proxies')
      .update({ status: 'suspended' })
      .eq('id', proxy.id)

    if (suspErr) {
      results.push(`error: ${proxy.id} — ${suspErr.message}`)
      continue
    }

    const client = (proxy.clients as unknown) as { email: string; name: string } | null
    if (client?.email) {
      await resend.emails.send({
        from:    FROM,
        to:      [client.email],
        subject: 'Sua cota foi esgotada — Luma Proxys',
        html: `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:40px 20px;background:#08070c;font-family:'Helvetica Neue',Arial,sans-serif;color:#f4f2f8;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
  <tr><td style="padding-bottom:24px;text-align:center;">
    <span style="font-size:20px;font-weight:800;">LUMA<span style="color:#c084fc;"> PROXYS</span></span>
  </td></tr>
  <tr><td style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:32px 36px;">
    <h2 style="margin:0 0 12px;font-size:20px;font-weight:900;">Cota de GB esgotada</h2>
    <p style="margin:0 0 20px;font-size:14px;color:rgba(244,242,248,.6);line-height:1.6;">
      Olá, <b style="color:#f4f2f8;">${client.name || client.email.split('@')[0]}</b>.<br>
      Sua proxy <b style="color:#a855f7;">${proxy.label}</b> atingiu o limite de <b>${proxy.gb_limit}GB</b> e foi suspensa automaticamente.
    </p>
    <div style="background:#0d0b12;border:1px solid rgba(168,85,247,.2);border-radius:12px;padding:16px 20px;margin-bottom:24px;font-family:'Courier New',monospace;font-size:13px;">
      <div style="color:rgba(244,242,248,.4);font-size:11px;margin-bottom:6px;letter-spacing:.1em;">PROXY SUSPENSA</div>
      <div style="color:#c084fc;">${proxy.host}:${proxy.port}</div>
      <div style="color:rgba(244,242,248,.5);">usuário: ${proxy.username}</div>
    </div>
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/?checkout=5"
       style="display:inline-block;background:#a855f7;color:#0a0612;font-weight:800;font-size:14px;padding:13px 24px;border-radius:12px;text-decoration:none;">
      Recarregar proxy
    </a>
    <p style="margin:18px 0 0;font-size:12px;color:rgba(244,242,248,.3);">Recarregue sua proxy para continuar usando a rede Luma Proxys.</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
      })
    }

    suspended++
    results.push(`suspended: ${proxy.id} — ${proxy.used_gb}/${proxy.gb_limit}GB`)
  }

  // Insert usage snapshots for chart history
  const now = new Date().toISOString()
  const snapshots = (refreshed ?? [])
    .filter((p: any) => p.assigned_to && p.used_gb != null)
    .map((p: any) => ({
      proxy_id:   p.id,
      client_id:  p.assigned_to,
      used_gb:    Number(p.used_gb),
      snapped_at: now,
    }))

  if (snapshots.length > 0) {
    await supabase.from('usage_snapshots').insert(snapshots)
    // Clean up snapshots older than 30 days
    await supabase
      .from('usage_snapshots')
      .delete()
      .lt('snapped_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  }

  return NextResponse.json({
    checked:   refreshed?.length ?? 0,
    suspended,
    snapshots: snapshots.length,
    results,
    ran_at:    now,
  })
}
