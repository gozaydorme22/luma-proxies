import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

// GET — chamado pelo Vercel Cron a cada 15 minutos
// Quando tiver API do fornecedor: consulta used_gb e suspende se esgotado
// Por ora: apenas verifica proxies que já passaram da cota manualmente
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

  const toSuspend = (proxies ?? []).filter((p: any) => Number(p.used_gb) >= Number(p.gb_limit))

  let suspended = 0
  const results: string[] = []

  for (const proxy of toSuspend) {
    // Suspende no banco
    const { error: suspErr } = await supabase
      .from('proxies')
      .update({ status: 'suspended' })
      .eq('id', proxy.id)

    if (suspErr) {
      results.push(`error: ${proxy.id} — ${suspErr.message}`)
      continue
    }

    // Notifica o cliente
    const client = (proxy.clients as unknown) as { email: string; name: string } | null
    if (client?.email) {
      await resend.emails.send({
        from:    FROM,
        to:      [client.email],
        subject: 'Sua cota foi esgotada — Luma Proxies',
        html: `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:40px 20px;background:#08070c;font-family:'Helvetica Neue',Arial,sans-serif;color:#f4f2f8;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
  <tr><td style="padding-bottom:24px;text-align:center;">
    <span style="font-size:20px;font-weight:800;">LUMA<span style="color:#c084fc;"> PROXIES</span></span>
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
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/dashboard/recarga"
       style="display:inline-block;background:#a855f7;color:#0a0612;font-weight:800;font-size:14px;padding:13px 24px;border-radius:12px;text-decoration:none;">
      Comprar nova proxy
    </a>
    <p style="margin:18px 0 0;font-size:12px;color:rgba(244,242,248,.3);">Adquira um novo pacote para continuar usando a rede Luma Proxies.</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
      })
    }

    suspended++
    results.push(`suspended: ${proxy.id} — ${proxy.used_gb}/${proxy.gb_limit}GB`)
  }

  return NextResponse.json({ checked: proxies?.length ?? 0, suspended, results, ran_at: new Date().toISOString() })
}
