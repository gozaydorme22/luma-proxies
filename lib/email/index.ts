import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

const base = (content: string) => `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Luma Proxies</title></head>
<body style="margin:0;padding:0;background:#08070c;font-family:'Helvetica Neue',Arial,sans-serif;color:#f4f2f8;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#08070c;min-height:100vh;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
  <!-- Logo -->
  <tr><td style="padding-bottom:32px;text-align:center;">
    <span style="font-size:22px;font-weight:800;letter-spacing:-.02em;color:#f4f2f8;">LUMA<span style="color:#c084fc;"> PROXIES</span></span>
  </td></tr>
  <!-- Card -->
  <tr><td style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:36px 40px;">
    ${content}
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding-top:28px;text-align:center;font-size:12px;color:rgba(244,242,248,.3);">
    © 2026 Luma Proxies · Todos os direitos reservados<br>
    Você recebeu este e-mail porque está cadastrado na Luma Proxies.
  </td></tr>
</table>
</td></tr></table>
</body></html>`

export async function sendWelcomeEmail(to: string, name: string) {
  if (!process.env.RESEND_API_KEY) return

  const content = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;letter-spacing:-.02em;color:#f4f2f8;">
      Bem-vindo à Luma Proxies, ${name.split(' ')[0]}!
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:rgba(244,242,248,.6);line-height:1.6;">
      Sua conta foi criada com sucesso. Agora você tem acesso à melhor infraestrutura de proxies do Brasil.
    </p>

    <div style="background:rgba(168,85,247,.1);border:1px solid rgba(168,85,247,.25);border-radius:12px;padding:20px;margin-bottom:28px;">
      <p style="margin:0;font-size:14px;color:#c084fc;font-weight:700;">O que você pode fazer agora:</p>
      <ul style="margin:10px 0 0;padding-left:18px;font-size:14px;color:rgba(244,242,248,.7);line-height:2;">
        <li>Adquirir proxies residenciais, mobile e CPA</li>
        <li>Monitorar seu consumo em tempo real</li>
        <li>Recarregar seu saldo instantaneamente via PIX</li>
      </ul>
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/"
       style="display:inline-block;background:#a855f7;color:#0a0612;font-weight:800;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;letter-spacing:-.01em;">
      Acessar minha conta
    </a>

    <p style="margin:28px 0 0;font-size:13px;color:rgba(244,242,248,.35);">
      Se você não criou esta conta, ignore este e-mail.
    </p>`

  await resend.emails.send({
    from:    FROM,
    to:      [to],
    subject: 'Boas-vindas à Luma Proxies — sua conta está pronta',
    html:    base(content),
  })
}

export async function sendProxyDeliveryEmail(to: string, name: string, proxy: {
  name: string; type: string; host: string; port: number
  username: string; password: string; totalGb: number
}) {
  if (!process.env.RESEND_API_KEY) return

  const content = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;letter-spacing:-.02em;color:#f4f2f8;">
      Sua proxy está pronta, ${name.split(' ')[0]}!
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:rgba(244,242,248,.6);line-height:1.6;">
      Pedido confirmado e proxy ativada imediatamente. Aqui estão suas credenciais de acesso:
    </p>

    <div style="background:#0d0b12;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:20px;margin-bottom:24px;font-family:'Courier New',monospace;">
      <table width="100%" cellpadding="6" cellspacing="0">
        <tr>
          <td style="font-size:11px;color:rgba(244,242,248,.4);letter-spacing:.1em;text-transform:uppercase;width:110px;">Proxy</td>
          <td style="font-size:14px;color:#f4f2f8;font-weight:700;">${proxy.name}</td>
        </tr>
        <tr>
          <td style="font-size:11px;color:rgba(244,242,248,.4);letter-spacing:.1em;text-transform:uppercase;">Tipo</td>
          <td style="font-size:14px;color:#f4f2f8;">${proxy.type}</td>
        </tr>
        <tr>
          <td style="font-size:11px;color:rgba(244,242,248,.4);letter-spacing:.1em;text-transform:uppercase;">Host</td>
          <td style="font-size:14px;color:#c084fc;">${proxy.host}</td>
        </tr>
        <tr>
          <td style="font-size:11px;color:rgba(244,242,248,.4);letter-spacing:.1em;text-transform:uppercase;">Porta</td>
          <td style="font-size:14px;color:#f4f2f8;">${proxy.port}</td>
        </tr>
        <tr>
          <td style="font-size:11px;color:rgba(244,242,248,.4);letter-spacing:.1em;text-transform:uppercase;">Usuário</td>
          <td style="font-size:14px;color:#f4f2f8;">${proxy.username}</td>
        </tr>
        <tr>
          <td style="font-size:11px;color:rgba(244,242,248,.4);letter-spacing:.1em;text-transform:uppercase;">Senha</td>
          <td style="font-size:14px;color:#f4f2f8;">${proxy.password}</td>
        </tr>
        <tr>
          <td style="font-size:11px;color:rgba(244,242,248,.4);letter-spacing:.1em;text-transform:uppercase;">Volume</td>
          <td style="font-size:14px;color:#34d399;font-weight:700;">${proxy.totalGb} GB</td>
        </tr>
      </table>
    </div>

    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/"
       style="display:inline-block;background:#a855f7;color:#0a0612;font-weight:800;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;">
      Acessar minha conta
    </a>

    <p style="margin:24px 0 0;font-size:13px;color:rgba(244,242,248,.4);line-height:1.6;">
      Qualquer dúvida, entre em contato pelo nosso grupo no WhatsApp.
    </p>`

  await resend.emails.send({
    from:    FROM,
    to:      [to],
    subject: `Proxy ativada: ${proxy.name} — ${proxy.totalGb} GB`,
    html:    base(content),
  })
}

export async function sendOrderConfirmationEmail(to: string, name: string, order: {
  id: string; productName: string; volumeGb: number; totalBrl: number
}) {
  if (!process.env.RESEND_API_KEY) return

  const content = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;letter-spacing:-.02em;color:#f4f2f8;">
      Pedido recebido!
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:rgba(244,242,248,.6);line-height:1.6;">
      Olá, ${name.split(' ')[0]}. Recebemos seu pedido e estamos aguardando a confirmação do pagamento via PIX.
    </p>

    <div style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:13px;color:#fbbf24;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Resumo do pedido</p>
      <table width="100%" cellpadding="5" cellspacing="0" style="font-size:14px;">
        <tr>
          <td style="color:rgba(244,242,248,.5);">Produto</td>
          <td style="color:#f4f2f8;font-weight:700;text-align:right;">${order.productName}</td>
        </tr>
        <tr>
          <td style="color:rgba(244,242,248,.5);">Volume</td>
          <td style="color:#f4f2f8;text-align:right;">${order.volumeGb} GB</td>
        </tr>
        <tr>
          <td style="color:rgba(244,242,248,.5);">Total</td>
          <td style="color:#c084fc;font-weight:800;font-size:18px;text-align:right;">
            R$ ${order.totalBrl.toFixed(2).replace('.', ',')}
          </td>
        </tr>
        <tr>
          <td style="color:rgba(244,242,248,.5);padding-top:8px;">Nº do pedido</td>
          <td style="color:rgba(244,242,248,.4);font-family:'Courier New',monospace;font-size:11px;text-align:right;">${order.id.slice(0, 8).toUpperCase()}</td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 20px;font-size:14px;color:rgba(244,242,248,.6);">
      Após a confirmação do PIX, sua proxy será ativada automaticamente e você receberá outro e-mail com as credenciais.
    </p>

    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/"
       style="display:inline-block;background:#a855f7;color:#0a0612;font-weight:800;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;">
      Acessar minha conta
    </a>`

  await resend.emails.send({
    from:    FROM,
    to:      [to],
    subject: `Pedido #${order.id.slice(0, 8).toUpperCase()} recebido — aguardando PIX`,
    html:    base(content),
  })
}
