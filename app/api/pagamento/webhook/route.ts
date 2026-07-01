import { NextRequest, NextResponse, after } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createServerClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import {
  createSubAccount,
  updateSubAccount,
  listSubAccounts,
  makeUsername,
  makePassword,
  connectionUsername,
  mgmtUsername,
  kbToGb,
  GATEWAY_HOST,
  GATEWAY_PORT,
} from '@/lib/smartproxy'

const resend  = new Resend(process.env.RESEND_API_KEY)
const FROM    = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const metaB64 = searchParams.get('m')
  const sig     = searchParams.get('s')
  const secret = process.env.SYNCPAY_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  const expectedSig = createHmac('sha256', secret).update(metaB64 ?? '').digest('base64url')
  const sigBuf      = Buffer.from(sig ?? '')
  const expBuf      = Buffer.from(expectedSig)
  if (!sig || sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!metaB64) return NextResponse.json({ error: 'Missing meta' }, { status: 400 })

  interface Meta { uid: string; gb: number; plan_label: string; total_brl: number; coupon: string | null; discount_pct?: number; nonce?: string; is_recharge?: boolean }
  let meta: Meta
  try {
    meta = JSON.parse(Buffer.from(metaB64, 'base64url').toString()) as Meta
  } catch {
    return NextResponse.json({ error: 'Invalid meta' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const status: string = (body?.data?.status ?? body?.status ?? '') as string

  if (status !== 'completed') {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const supabase = createServerClient()

  // Idempotency check — nonce-based (new) with time-window fallback (legacy meta without nonce)
  if (meta.nonce) {
    const { count: nonceCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('payment_nonce', meta.nonce)
    if (nonceCount && nonceCount > 0) {
      console.log('[webhook] duplicate nonce — skipping:', meta.nonce)
      return NextResponse.json({ ok: true, duplicate: true })
    }
  } else {
    const { count: existingOrders } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', meta.uid)
      .eq('total_brl', meta.total_brl)
      .eq('status', 'pago')
      .gte('paid_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
    if (existingOrders && existingOrders > 0) {
      console.log('[webhook] duplicate — skipping uid:', meta.uid)
      return NextResponse.json({ ok: true, duplicate: true })
    }
  }

  // Schedule all async work to run AFTER the response is sent
  // (keeps Vercel function alive until provisioning + email complete)
  after(async () => {
    const supabase = createServerClient()

    // Fetch client for email
    const { data: client } = await supabase
      .from('clients')
      .select('email, name')
      .eq('id', meta.uid)
      .single()

    console.log('[webhook] client lookup:', client ? client.email : 'NOT FOUND')

    // Record order
    const { error: orderErr } = await supabase.from('orders').insert({
      client_id:      meta.uid,
      quantity:       meta.gb,
      total_brl:      meta.total_brl,
      status:         'pago',
      payment_method: meta.is_recharge ? 'pix_recarga' : 'pix_nova',
      paid_at:        new Date().toISOString(),
      ...(meta.nonce ? { payment_nonce: meta.nonce } : {}),
    })
    if (orderErr) console.error('[webhook] order insert:', orderErr.message)

    const smartproxyEnabled = !!process.env.SMARTPROXY_SESSION_TOKEN
    let proxyHost: string
    let proxyPort: number
    let proxyUser: string
    let proxyPass: string
    let proxyLabel: string
    let proxyId: string | undefined
    let emailGbLimit: number = Number(meta.gb)

    if (smartproxyEnabled) {
      // Look up existing proxy first — determines username generation for new vs recharge.
      // For explicit recharge, also include suspended proxies (GB exhausted, not yet recharged).
      const { data: existingProxies } = await supabase
        .from('proxies')
        .select('id, gb_limit, password, username')
        .eq('assigned_to', meta.uid)
        .in('status', meta.is_recharge ? ['sold', 'suspended'] : ['sold'])
        .order('sold_at', { ascending: false })
        .limit(1)
      const existingProxy = existingProxies?.[0] ?? null

      // When creating a new proxy while user already has one, derive username from the
      // payment nonce (UUID) so it doesn't collide with the existing sub-account on SmartProxy
      const baseUser = (!meta.is_recharge && existingProxy && meta.nonce)
        ? `luma${meta.nonce.replace(/-/g, '').slice(0, 8).toLowerCase()}`
        : makeUsername(meta.uid)

      proxyUser  = connectionUsername(baseUser)
      proxyPass  = makePassword()
      proxyHost  = GATEWAY_HOST
      proxyPort  = GATEWAY_PORT
      proxyLabel = `${meta.plan_label} Residencial BR`

      let isRecharge = false
      let newGbLimit = meta.gb

      if (meta.is_recharge) {
        // Explicit recharge — add GB to existing sub-account on SmartProxy
        isRecharge = true
        const spMgmtUser = existingProxy?.username
          ? mgmtUsername(existingProxy.username)
          : `smart-${makeUsername(meta.uid)}`
        try {
          const subAccounts = await listSubAccounts()
          const existing = subAccounts.find(u => u.username === spMgmtUser)
          const existingLimitGb = existing ? kbToGb(existing.limit_flow ?? 0) : 0
          const newLimit = existingLimitGb + meta.gb
          newGbLimit = newLimit
          await updateSubAccount(spMgmtUser, { status: 1, limitGb: newLimit })
          console.log('[webhook] explicit recharge, new limit:', newLimit, '(was:', existingLimitGb, '+ new:', meta.gb, ')')
        } catch (e2) {
          console.error('[webhook] SmartProxy recharge failed:', e2)
          sendAdminAlert()
          return
        }
      } else {
        // New proxy — create sub-account on SmartProxy
        try {
          console.log('[webhook] creating sub-account:', baseUser)
          await createSubAccount(baseUser, proxyPass, meta.gb)
          console.log('[webhook] sub-account created:', proxyUser)
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          console.warn('[webhook] createSubAccount failed, falling back to recharge:', msg)
          isRecharge = true
          const spMgmtUser = existingProxy?.username
            ? mgmtUsername(existingProxy.username)
            : `smart-${makeUsername(meta.uid)}`
          try {
            const subAccounts = await listSubAccounts()
            const existing = subAccounts.find(u => u.username === spMgmtUser)
            const existingLimitGb = existing ? kbToGb(existing.limit_flow ?? 0) : 0
            const newLimit = existingLimitGb + meta.gb
            newGbLimit = newLimit
            await updateSubAccount(spMgmtUser, { status: 1, limitGb: newLimit })
            console.log('[webhook] fallback recharge, new limit:', newLimit)
          } catch (e2) {
            console.error('[webhook] SmartProxy provision failed:', e2)
            sendAdminAlert()
            return
          }
        }
      }

      if (isRecharge && existingProxy?.password) {
        proxyPass  = existingProxy.password   // keep same credentials
        proxyUser  = existingProxy.username   // keep same username
        proxyLabel = `${newGbLimit} GB Residencial BR`
      } else if (!isRecharge) {
        newGbLimit = meta.gb
      }

      const proxyRow = {
        label:       proxyLabel,
        host:        proxyHost,
        port:        proxyPort,
        username:    proxyUser,
        password:    proxyPass,
        gb_limit:    newGbLimit,
        price:       meta.total_brl,
        proxy_type:  'residencial',
        status:      'sold',
        assigned_to: meta.uid,
        sold_at:     new Date().toISOString(),
      }

      // Recharge updates existing row; new proxy always inserts (even if user has another)
      const { data: written, error: writeErr } = (isRecharge && existingProxy)
        ? await supabase.from('proxies').update(proxyRow).eq('id', existingProxy.id).select('id').single()
        : await supabase.from('proxies').insert(proxyRow).select('id').single()

      if (writeErr) {
        console.error('[webhook] proxy write:', writeErr.message)
      } else {
        proxyId = written?.id
        emailGbLimit = newGbLimit
        console.log('[webhook] proxy written, id:', proxyId)
      }
    } else {
      // Fallback: manual stock
      const { data: stockProxy, error: proxyErr } = await supabase
        .from('proxies')
        .select('id,label,host,port,username,password,gb_limit,proxy_type')
        .eq('status', 'available')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (proxyErr || !stockProxy) {
        console.error('[webhook] sem estoque:', proxyErr?.message)
        sendAdminAlert()
        return
      }

      const { data: claimedRows } = await supabase.from('proxies')
        .update({ status: 'sold', assigned_to: meta.uid, sold_at: new Date().toISOString() })
        .eq('id', stockProxy.id)
        .eq('status', 'available')
        .select('id')

      if (!claimedRows || claimedRows.length === 0) {
        console.error('[webhook] proxy claim race — another webhook claimed this proxy')
        sendAdminAlert()
        return
      }

      proxyHost  = stockProxy.host
      proxyPort  = stockProxy.port
      proxyUser  = stockProxy.username
      proxyPass  = stockProxy.password
      proxyLabel = stockProxy.label
      proxyId    = stockProxy.id
    }

    // Credentials email
    if (client?.email) {
      const name = client.name || client.email.split('@')[0]
      const { error: credErr } = await resend.emails.send({
        from:    FROM,
        to:      [client.email],
        subject: `Sua proxy está pronta — ${meta.plan_label} · Luma Proxys`,
        html: `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:40px 20px;background:#08070c;font-family:'Helvetica Neue',Arial,sans-serif;color:#f4f2f8;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
  <tr><td style="padding-bottom:24px;text-align:center;">
    <span style="font-size:20px;font-weight:800;letter-spacing:-.02em;">LUMA<span style="color:#c084fc;">PROXYS</span></span>
  </td></tr>
  <tr><td style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:32px 36px;">
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;">Sua proxy está pronta! 🚀</h2>
    <p style="margin:0 0 24px;font-size:14px;color:rgba(244,242,248,.6);line-height:1.6;">
      Olá, <b style="color:#f4f2f8;">${name}</b>. Seu pacote <b style="color:#a855f7;">${proxyLabel}</b> foi ativado.
    </p>
    <div style="background:#0d0b12;border:1px solid rgba(168,85,247,.25);border-radius:14px;padding:20px 24px;margin-bottom:20px;font-family:'Courier New',monospace;">
      <table width="100%" cellpadding="7" cellspacing="0" style="font-size:13px;">
        <tr><td style="color:rgba(244,242,248,.4);width:80px;">Host</td><td style="color:#c084fc;font-weight:700;">${proxyHost}</td></tr>
        <tr><td style="color:rgba(244,242,248,.4);">Porta HTTP</td><td style="color:#f4f2f8;">${proxyPort}</td></tr>
        <tr><td style="color:rgba(244,242,248,.4);">Usuário</td><td style="color:#f4f2f8;">${proxyUser}</td></tr>
        <tr><td style="color:rgba(244,242,248,.4);">Senha</td><td style="color:#f4f2f8;">${proxyPass}</td></tr>
        <tr><td style="color:rgba(244,242,248,.4);">Cota</td><td style="color:#34d399;font-weight:700;">${emailGbLimit} GB</td></tr>
      </table>
    </div>
    <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:12px 16px;margin-bottom:24px;font-family:'Courier New',monospace;font-size:12px;color:rgba(244,242,248,.55);word-break:break-all;">
      ${proxyHost}:${proxyPort}:${proxyUser}:${proxyPass}
    </div>
    <a href="${APP_URL}/" style="display:inline-block;background:#a855f7;color:#fff;font-weight:700;font-size:14px;padding:13px 28px;border-radius:12px;text-decoration:none;">
      Acessar minha conta →
    </a>
  </td></tr>
  <tr><td style="padding-top:20px;text-align:center;font-size:11px;color:rgba(244,242,248,.2);">
    © 2026 Luma Proxys
  </td></tr>
</table></td></tr></table>
</body></html>`,
      })
      if (credErr) console.error('[webhook] credentials email:', credErr)
      else console.log('[webhook] credentials email sent to:', client.email)
    } else {
      console.warn('[webhook] no client email — skipping credentials email')
    }

    // Payment confirmation email
    if (client?.email) {
      const name       = client.name || client.email.split('@')[0]
      const discountLabel = meta.discount_pct ? ` · −${Math.round(meta.discount_pct * 100)}%` : ''
      const couponLine = meta.coupon
        ? `<tr><td style="color:rgba(244,242,248,.4);">Cupom</td><td style="color:#34d399;text-align:right;font-family:'Courier New',monospace;">${meta.coupon}${discountLabel}</td></tr>`
        : ''

      const { error: confErr } = await resend.emails.send({
        from:    FROM,
        to:      [client.email],
        subject: `Pagamento confirmado — ${meta.plan_label} · Luma Proxys`,
        html: `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:40px 20px;background:#08070c;font-family:'Helvetica Neue',Arial,sans-serif;color:#f4f2f8;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
  <tr><td style="padding-bottom:24px;text-align:center;">
    <span style="font-size:20px;font-weight:800;letter-spacing:-.02em;">LUMA<span style="color:#c084fc;">PROXYS</span></span>
  </td></tr>
  <tr><td style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:32px 36px;">
    <h2 style="margin:0 0 6px;font-size:22px;font-weight:700;">Pagamento confirmado!</h2>
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
          <td style="color:#a855f7;font-weight:700;font-size:16px;text-align:right;">${fmt(meta.total_brl)}</td>
        </tr>
      </table>
    </div>
    <a href="${APP_URL}/" style="display:inline-block;background:#a855f7;color:#fff;font-weight:700;font-size:14px;padding:13px 28px;border-radius:12px;text-decoration:none;">
      Acessar minha conta →
    </a>
  </td></tr>
  <tr><td style="padding-top:20px;text-align:center;font-size:11px;color:rgba(244,242,248,.2);">
    © 2026 Luma Proxys · Dúvidas? Responda este email.
  </td></tr>
</table></td></tr></table>
</body></html>`,
      })
      if (confErr) console.error('[webhook] confirmation email:', confErr)
      else console.log('[webhook] confirmation email sent to:', client.email)
    }

    void proxyId

    // Increment coupon uses_count and record per-user use
    if (meta.coupon) {
      const { data: couponRow } = await supabase
        .from('coupons')
        .select('id, uses_count')
        .eq('code', meta.coupon)
        .single()
      if (couponRow) {
        await supabase
          .from('coupons')
          .update({ uses_count: couponRow.uses_count + 1 })
          .eq('id', couponRow.id)
        // Record per-user usage (UNIQUE constraint prevents duplicates)
        await supabase
          .from('coupon_uses')
          .insert({ coupon_id: couponRow.id, client_id: meta.uid })
      }
    }
  })

  function sendAdminAlert() {
    const adminEmail = process.env.ADMIN_EMAIL ?? 'ruanpablo2702@gmail.com'
    resend.emails.send({
      from:    FROM,
      to:      [adminEmail],
      subject: '⚠️ Fulfill falhou — intervenção manual necessária',
      html: `<p>Um pagamento foi confirmado mas o provisionamento da proxy falhou.</p>
<p><b>Cliente:</b> ${meta.uid}<br>
<b>Plano:</b> ${meta.plan_label}<br>
<b>Valor:</b> R$ ${meta.total_brl.toFixed(2)}</p>
<p>Verifique os logs do Vercel e provisione manualmente.</p>`,
    }).catch(e => console.error('[webhook] admin alert', e))
  }

  return NextResponse.json({ ok: true })
}