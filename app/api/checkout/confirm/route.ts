import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Resend } from 'resend'
import { createServerClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  const hdrs = await headers()
  const uid  = hdrs.get('x-uid')
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { whatsapp, plan_label, total, method, coupon } = await req.json()

  const supabase = createServerClient()

  // Busca dados do cliente
  const { data: client } = await supabase
    .from('clients')
    .select('email, name')
    .eq('id', uid)
    .single()

  if (!client?.email) {
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  }

  // Salva WhatsApp se informado
  if (whatsapp) {
    await supabase.from('clients').update({ whatsapp }).eq('id', uid)
  }

  const name       = client.name || client.email.split('@')[0]
  const fmtBrl     = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const methodLabel = method === 'pix' ? 'PIX' : 'Criptomoeda'
  const dashUrl    = `${APP_URL}/dashboard`

  await resend.emails.send({
    from:    FROM,
    to:      [client.email],
    subject: `Compra confirmada — ${plan_label} · Luma Proxies`,
    html: `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:40px 20px;background:#08070c;font-family:'Helvetica Neue',Arial,sans-serif;color:#f4f2f8;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
  <tr><td style="padding-bottom:24px;text-align:center;">
    <span style="font-size:20px;font-weight:800;letter-spacing:-.02em;">LUMA<span style="color:#c084fc;"> PROXIES</span></span>
  </td></tr>
  <tr><td style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:32px 36px;">
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:900;">Compra confirmada! ✅</h2>
    <p style="margin:0 0 28px;font-size:14px;color:rgba(244,242,248,.55);line-height:1.6;">
      Olá, <b style="color:#f4f2f8;">${name}</b>. Recebemos o seu pedido e ele está sendo processado.
    </p>

    <div style="background:#0d0b12;border:1px solid rgba(168,85,247,.2);border-radius:14px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="8" cellspacing="0" style="font-size:14px;">
        <tr>
          <td style="color:rgba(244,242,248,.4);">Plano</td>
          <td style="color:#f4f2f8;text-align:right;font-weight:600;">${plan_label} Residencial Rotativa</td>
        </tr>
        <tr>
          <td style="color:rgba(244,242,248,.4);">Método</td>
          <td style="color:#f4f2f8;text-align:right;">${methodLabel}</td>
        </tr>
        ${coupon ? `<tr>
          <td style="color:rgba(244,242,248,.4);">Cupom</td>
          <td style="color:#34d399;text-align:right;font-family:'Courier New',monospace;">${coupon} · −10%</td>
        </tr>` : ''}
        <tr>
          <td style="color:rgba(244,242,248,.4);">Total</td>
          <td style="color:#a855f7;font-weight:800;font-size:16px;text-align:right;">${fmtBrl(total)}</td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 20px;font-size:13.5px;color:rgba(244,242,248,.5);line-height:1.7;">
      Assim que o pagamento for confirmado, sua proxy será ativada e você receberá todas as credenciais por email.<br><br>
      Você também pode acompanhar seu pedido diretamente no dashboard:
    </p>

    <a href="${dashUrl}" style="display:inline-block;background:#a855f7;color:#0a0612;font-weight:800;font-size:14px;padding:13px 28px;border-radius:12px;text-decoration:none;">
      Acessar dashboard →
    </a>
  </td></tr>
  <tr><td style="padding-top:20px;text-align:center;font-size:11px;color:rgba(244,242,248,.2);">
    © 2026 Luma Proxies · Dúvidas? Responda este email.
  </td></tr>
</table></td></tr></table>
</body></html>`,
  })

  return NextResponse.json({ ok: true })
}
