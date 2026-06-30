import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createPixCashIn } from '@/lib/syncpay'
import { createServerClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// Tabela de preços canônica — única fonte de verdade no servidor
const PLANS: Record<string, { price: number; label: string }> = {
  '3':  { price: 18.90,  label: '3 GB'  },
  '5':  { price: 31.90,  label: '5 GB'  },
  '10': { price: 60.90,  label: '10 GB' },
  '20': { price: 120.90, label: '20 GB' },
}
const COUPON_CODE     = 'LUMA10'
const COUPON_DISCOUNT = 0.10

export async function POST(req: NextRequest) {
  const hdrs = await headers()
  const uid  = hdrs.get('x-uid')
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { gb, cpf, whatsapp, coupon } = await req.json()

  if (!gb || !cpf) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  // Valida plano — preço calculado no servidor, nunca vindo do cliente
  const plan = PLANS[String(gb)]
  if (!plan) {
    return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
  }

  const cleanCpf = (cpf as string).replace(/\D/g, '')
  if (cleanCpf.length !== 11) {
    return NextResponse.json({ error: 'CPF inválido.' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data: client } = await supabase
    .from('clients')
    .select('email, name, first_purchase_coupon_used')
    .eq('id', uid)
    .single()

  if (!client?.email) {
    console.error('[pix] cliente não encontrado para uid:', uid)
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  }

  // Valida cupom server-side
  let appliedCoupon: string | null = null
  let amount = plan.price
  if (coupon === COUPON_CODE) {
    if (client.first_purchase_coupon_used) {
      return NextResponse.json({ error: 'Cupom já utilizado.' }, { status: 400 })
    }
    amount = Math.round(plan.price * (1 - COUPON_DISCOUNT) * 100) / 100
    appliedCoupon = COUPON_CODE
  }

  const plan_label = plan.label

  if (whatsapp) {
    await supabase.from('clients').update({ whatsapp }).eq('id', uid)
  }

  // Only check stock when SmartProxy auto-provisioning is NOT configured
  if (!process.env.SMARTPROXY_SESSION_TOKEN) {
    const { count } = await supabase
      .from('proxies')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'available')

    if (!count || count === 0) {
      return NextResponse.json({ error: 'Sem estoque disponível no momento.' }, { status: 409 })
    }
  }

  // Encode order metadata into the webhook URL so the handler knows what to fulfill
  const meta = Buffer.from(
    JSON.stringify({ uid, gb, plan_label, total_brl: amount, coupon: appliedCoupon })
  ).toString('base64url')

  const webhookUrl = `${APP_URL}/api/pagamento/webhook?secret=${process.env.SYNCPAY_WEBHOOK_SECRET}&m=${meta}`

  try {
    const result = await createPixCashIn({
      amount,
      description: `Luma Proxys - ${plan_label}`,
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
