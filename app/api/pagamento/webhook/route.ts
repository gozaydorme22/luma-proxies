import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend  = new Resend(process.env.RESEND_API_KEY)
const FROM    = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl

  // Validate secret to reject unauthenticated callers
  if (searchParams.get('secret') !== process.env.SYNCPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const metaB64 = searchParams.get('m')
  if (!metaB64) return NextResponse.json({ error: 'Missing meta' }, { status: 400 })

  interface Meta { uid: string; gb: number; plan_label: string; total_brl: number; coupon: string | null }
  let meta: Meta
  try {
    meta = JSON.parse(Buffer.from(metaB64, 'base64url').toString()) as Meta
  } catch {
    return NextResponse.json({ error: 'Invalid meta' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const status: string = (body?.data?.status ?? body?.status ?? '') as string

  // Only act on successful payments
  if (status !== 'completed') {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const supabase = createServerClient()

  // Fetch client for email
  const { data: client } = await supabase
    .from('clients')
    .select('email, name')
    .eq('id', meta.uid)
    .single()

  // Record the paid order (best-effort — failure won't block the email)
  supabase.from('orders').insert({
    client_id:      meta.uid,
    quantity:       meta.gb,
    total_brl:      meta.total_brl,
    status:         'paid',
    payment_method: 'pix',
    paid_at:        new Date().toISOString(),
  }).then(({ error }) => { if (error) console.error('[webhook] order insert', error) })

  if (client?.email) {
    const name        = client.name || client.email.split('@')[0]
    const couponLine  = meta.coupon
      ? `<tr><td style="color:rgba(244,242,248,.4);">Cupom</td><td style="color:#34d399;text-align:right;font-family:'Courier New',monospace;">${meta.coupon} · −10%</td></tr>`
      : ''

    await resend.emails.send({
      from:    FROM,
      to:      [client.email],
      subject: `Pagamento confirmado — ${meta.plan_label} · Luma Proxies`,
      html: `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:40px 20px;background:#08070c;font-family:'Helvetica Neue',Arial,sans-serif;color:#f4f2f8;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
  <tr><td style="padding-bottom:24px;text-align:center;">
    <span style="font-size:20px;font-weight:800;letter-spacing:-.02em;">LUMA<span style="color:#c084fc;"> PROXIES</span></span>
  </td></tr>
  <tr><td style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:32px 36px;">
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:900;">Pagamento confirmado! ✅</h2>
    <p style="margin:0 0 28px;font-size:14px;color:rgba(244,242,248,.55);line-height:1.6;">
      Olá, <b style="color:#f4f2f8;">${name}</b>. Seu PIX foi confirmado e seu acesso está sendo preparado.
    </p>
    <div style="background:#0d0b12;border:1px solid rgba(168,85,247,.2);border-radius:14px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="8" cellspacing="0" style="font-size:14px;">
        <tr>
          <td style="color:rgba(244,242,248,.4);">Plano</td>
          <td style="color:#f4f2f8;text-align:right;font-weight:600;">${meta.plan_label} Residencial Rotativa</td>
        </tr>
        <tr>
          <td style="color:rgba(244,242,248,.4);">Método</td>
          <td style="color:#f4f2f8;text-align:right;">PIX</td>
        </tr>
        ${couponLine}
        <tr>
          <td style="color:rgba(244,242,248,.4);">Total pago</td>
          <td style="color:#a855f7;font-weight:800;font-size:16px;text-align:right;">${fmt(meta.total_brl)}</td>
        </tr>
      </table>
    </div>
    <p style="margin:0 0 20px;font-size:13.5px;color:rgba(244,242,248,.5);line-height:1.7;">
      Em breve você receberá as credenciais da sua proxy por email.<br>Você pode acompanhar seu pedido no dashboard.
    </p>
    <a href="${APP_URL}/dashboard" style="display:inline-block;background:#a855f7;color:#fff;font-weight:800;font-size:14px;padding:13px 28px;border-radius:12px;text-decoration:none;">
      Acessar dashboard →
    </a>
  </td></tr>
  <tr><td style="padding-top:20px;text-align:center;font-size:11px;color:rgba(244,242,248,.2);">
    © 2026 Luma Proxies · Dúvidas? Responda este email.
  </td></tr>
</table></td></tr></table>
</body></html>`,
    })
  }

  return NextResponse.json({ ok: true })
}
