import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

const TYPE_LABEL: Record<string, string> = {
  residential_rotating: 'Residencial Rotativa',
  residential_sticky:   'Residencial Fixa',
  mobile:               'Mobile',
  cpa:                  'CPA',
  datacenter:           'Datacenter',
}

// POST — entrega a primeira proxy disponível do produto ao cliente
// Body: { product_id, client_id, order_id? }
export async function POST(req: NextRequest) {
  const role = req.headers.get('x-role')
  const uid  = req.headers.get('x-uid')
  if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  if (role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { product_id, client_id } = await req.json()
  if (!product_id || !client_id) {
    return NextResponse.json({ error: 'product_id e client_id são obrigatórios.' }, { status: 400 })
  }

  const supabase = createServerClient()

  // 1. Pega a primeira proxy disponível do produto (FIFO)
  const { data: proxy, error: proxyErr } = await supabase
    .from('proxies')
    .select('*')
    .eq('product_id', product_id)
    .eq('status', 'available')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (proxyErr || !proxy) {
    return NextResponse.json({ error: 'Sem estoque disponível para esse produto.' }, { status: 409 })
  }

  // 2. Marca como vendida atomicamente
  const { error: updateErr } = await supabase
    .from('proxies')
    .update({ status: 'sold', assigned_to: client_id, sold_at: new Date().toISOString() })
    .eq('id', proxy.id)
    .eq('status', 'available')

  if (updateErr) {
    return NextResponse.json({ error: 'Conflito ao alocar proxy. Tente novamente.' }, { status: 500 })
  }

  // 3. Busca dados do cliente
  const { data: client } = await supabase
    .from('clients')
    .select('email, name')
    .eq('id', client_id)
    .single()

  // 4. Envia email com as credenciais (fire-and-forget)
  if (client?.email) {
    const name = client.name || client.email.split('@')[0]
    resend.emails.send({
      from:    FROM,
      to:      [client.email],
      subject: `Proxy ativada — ${proxy.gb_limit}GB · Luma Proxys`,
      html: `<!DOCTYPE html><html lang="pt-BR"><body style="margin:0;padding:40px 20px;background:#08070c;font-family:'Helvetica Neue',Arial,sans-serif;color:#f4f2f8;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
  <tr><td style="padding-bottom:24px;text-align:center;">
    <span style="font-size:20px;font-weight:800;letter-spacing:-.02em;">LUMA<span style="color:#c084fc;" > PROXYS</span></span>
  </td></tr>
  <tr><td style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:32px 36px;">
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;">Sua proxy está pronta! 🚀</h2>
    <p style="margin:0 0 24px;font-size:14px;color:rgba(244,242,248,.6);line-height:1.6;">
      Olá, <b style="color:#f4f2f8;">${name}</b>. Seu pacote <b style="color:#a855f7;">${proxy.label}</b> foi ativado.
    </p>
    <div style="background:#0d0b12;border:1px solid rgba(168,85,247,.25);border-radius:14px;padding:20px 24px;margin-bottom:20px;font-family:'Courier New',monospace;">
      <table width="100%" cellpadding="7" cellspacing="0" style="font-size:13px;">
        <tr><td style="color:rgba(244,242,248,.4);width:80px;">Host</td><td style="color:#c084fc;font-weight:700;">${proxy.host}</td></tr>
        <tr><td style="color:rgba(244,242,248,.4);">Porta HTTP</td><td style="color:#f4f2f8;">${proxy.port}</td></tr>
        <tr><td style="color:rgba(244,242,248,.4);">Porta SOCKS5</td><td style="color:#f4f2f8;">${proxy.port + 1}</td></tr>
        <tr><td style="color:rgba(244,242,248,.4);">Usuário</td><td style="color:#f4f2f8;">${proxy.username}</td></tr>
        <tr><td style="color:rgba(244,242,248,.4);">Senha</td><td style="color:#f4f2f8;">${proxy.password}</td></tr>
        <tr><td style="color:rgba(244,242,248,.4);">Cota</td><td style="color:#34d399;font-weight:700;">${proxy.gb_limit} GB</td></tr>
        <tr><td style="color:rgba(244,242,248,.4);">Tipo</td><td style="color:#f4f2f8;">${TYPE_LABEL[proxy.proxy_type] ?? proxy.proxy_type}</td></tr>
      </table>
    </div>
    <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:12px 16px;margin-bottom:24px;font-family:'Courier New',monospace;font-size:12px;color:rgba(244,242,248,.55);word-break:break-all;">
      ${proxy.host}:${proxy.port}:${proxy.username}:${proxy.password}
    </div>
    <p style="margin:0 0 8px;font-size:12.5px;color:rgba(244,242,248,.45);line-height:1.7;">
      ⚡ Configure como <b>HTTP</b> (porta ${proxy.port}) ou <b>SOCKS5</b> (porta ${proxy.port + 1}).<br>
      🔄 IPs rotativos — cada requisição usa um IP diferente.<br>
      📊 Acesse sua conta para ver o status das suas proxies.
    </p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/"
       style="display:inline-block;margin-top:16px;background:#a855f7;color:#0a0612;font-weight:800;font-size:14px;padding:13px 28px;border-radius:12px;text-decoration:none;">
      Acessar minha conta
    </a>
  </td></tr>
  <tr><td style="padding-top:20px;text-align:center;font-size:11px;color:rgba(244,242,248,.25);">© 2026 Luma Proxys</td></tr>
</table></td></tr></table>
</body></html>`,
    }).catch(e => console.error('[fulfill] email', e))
  }

  return NextResponse.json({
    ok: true,
    proxy_id: proxy.id,
    credentials: { host: proxy.host, port: proxy.port, username: proxy.username, password: proxy.password, gb_limit: proxy.gb_limit },
  })
}
