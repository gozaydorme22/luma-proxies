import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createPixCashIn } from '@/lib/syncpay'
import { createServerClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  const hdrs = await headers()
  const uid  = hdrs.get('x-uid')
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount, gb, plan_label, cpf, whatsapp, coupon } = await req.json()

  if (!amount || !cpf || !plan_label) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const cleanCpf = (cpf as string).replace(/\D/g, '')
  if (cleanCpf.length !== 11) {
    return NextResponse.json({ error: 'CPF inválido.' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data: client } = await supabase
    .from('clients')
    .select('email, name')
    .eq('id', uid)
    .single()

  if (!client?.email) {
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  }

  if (whatsapp) {
    await supabase.from('clients').update({ whatsapp }).eq('id', uid)
  }

  // Encode order metadata into the webhook URL so the handler knows what to fulfill
  const meta = Buffer.from(
    JSON.stringify({ uid, gb, plan_label, total_brl: amount, coupon: coupon ?? null })
  ).toString('base64url')

  const webhookUrl = `${APP_URL}/api/pagamento/webhook?secret=${process.env.SYNCPAY_WEBHOOK_SECRET}&m=${meta}`

  try {
    const result = await createPixCashIn({
      amount,
      description: `Luma Proxies - ${plan_label}`,
      webhookUrl,
      client: {
        name:  client.name || client.email.split('@')[0],
        cpf:   cleanCpf,
        email: client.email,
        phone: ((whatsapp as string | undefined) ?? '').replace(/\D/g, ''),
      },
    })
    return NextResponse.json(result)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao gerar PIX.'
    console.error('[pix]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
