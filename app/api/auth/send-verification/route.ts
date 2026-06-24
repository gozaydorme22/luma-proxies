import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { createServerClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('__session')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    // Step 1: verify Firebase token
    let decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>
    try {
      decoded = await adminAuth.verifyIdToken(token)
    } catch (e) {
      console.error('[send-verification] STEP 1 verifyIdToken FAILED:', e)
      return NextResponse.json({ error: `verifyIdToken: ${String(e)}` }, { status: 500 })
    }

    const { name, email } = await req.json() as { name: string; email: string }
    console.log('[send-verification] uid:', decoded.uid, 'email:', email)

    const supabase = createServerClient()

    // Step 2: upsert client in Supabase
    try {
      const { error: insertErr } = await supabase.from('clients').insert({ id: decoded.uid, email, name })
      if (insertErr && insertErr.code !== '23505') {
        console.error('[send-verification] STEP 2 insert client FAILED:', insertErr)
        return NextResponse.json({ error: `supabase insert: ${insertErr.message}` }, { status: 500 })
      }
    } catch (e) {
      console.error('[send-verification] STEP 2 supabase insert THREW:', e)
      return NextResponse.json({ error: `supabase insert threw: ${String(e)}` }, { status: 500 })
    }

    // Step 3: invalidate old codes
    try {
      await supabase
        .from('verification_codes')
        .update({ used: true })
        .eq('uid', decoded.uid)
        .eq('used', false)
    } catch (e) {
      console.error('[send-verification] STEP 3 invalidate codes THREW:', e)
      // non-fatal, continue
    }

    // Step 4: insert new code
    const code      = genCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    try {
      const { error: codeErr } = await supabase.from('verification_codes').insert({
        uid:        decoded.uid,
        email,
        code,
        expires_at: expiresAt,
      })
      if (codeErr) {
        console.error('[send-verification] STEP 4 insert code FAILED:', codeErr)
        return NextResponse.json({ error: `supabase code insert: ${codeErr.message}` }, { status: 500 })
      }
    } catch (e) {
      console.error('[send-verification] STEP 4 insert code THREW:', e)
      return NextResponse.json({ error: `supabase code insert threw: ${String(e)}` }, { status: 500 })
    }

    // Step 5: send email via Resend
    const firstName = (name || email).split(' ')[0]
    console.log('[send-verification] sending email to:', email, 'from:', FROM, 'apiKey present:', !!process.env.RESEND_API_KEY)
    try {
      const result = await resend.emails.send({
        from:    FROM,
        to:      [email],
        subject: `${code} é o seu código de verificação — Luma Proxies`,
        html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Verificação</title></head>
<body style="margin:0;padding:0;background:#08070c;font-family:'Helvetica Neue',Arial,sans-serif;color:#f4f2f8;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
  <tr><td style="padding-bottom:28px;text-align:center;">
    <span style="font-size:20px;font-weight:800;letter-spacing:-.02em;">LUMA<span style="color:#c084fc;"> PROXIES</span></span>
  </td></tr>
  <tr><td style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:36px 40px;">
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#f4f2f8;">Olá, ${firstName}!</h1>
    <p style="margin:0 0 28px;font-size:15px;color:rgba(244,242,248,.6);">Use o código abaixo para verificar seu e-mail. Ele expira em 15 minutos.</p>
    <div style="background:#0d0b12;border:1px solid rgba(168,85,247,.3);border-radius:14px;padding:24px;text-align:center;margin-bottom:28px;">
      <span style="font-family:'Courier New',monospace;font-size:42px;font-weight:900;letter-spacing:12px;color:#a855f7;">${code}</span>
    </div>
    <p style="margin:0;font-size:13px;color:rgba(244,242,248,.35);">Se você não criou esta conta, ignore este e-mail.</p>
  </td></tr>
  <tr><td style="padding-top:24px;text-align:center;font-size:12px;color:rgba(244,242,248,.25);">
    © 2026 Luma Proxies
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
      })
      console.log('[send-verification] STEP 5 resend result:', JSON.stringify(result))
      if (result.error) {
        console.error('[send-verification] STEP 5 resend API error:', result.error)
        return NextResponse.json({ error: `resend error: ${result.error.message}` }, { status: 500 })
      }
    } catch (e) {
      console.error('[send-verification] STEP 5 resend THREW:', e)
      return NextResponse.json({ error: `resend threw: ${String(e)}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[send-verification] outer catch:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
