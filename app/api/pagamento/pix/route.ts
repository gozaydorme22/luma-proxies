import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createHmac } from 'crypto'
import { createPixCashIn } from '@/lib/syncpay'
import { createServerClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  const hdrs = await headers()
  const uid  = hdrs.get('x-uid')
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { gb, cpf, whatsapp, coupon } = await req.json()

  if (!gb || !cpf) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const cleanCpf = (cpf as string).replace(/\D/g, '')
  if (cleanCpf.length !== 11) {
    return NextResponse.json({ error: 'CPF inválido.' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Busca preço do banco — fonte única de verdade
  const { data: product } = await supabase
    .from('products')
    .select('price, name')
    .eq('gb_limit', Number(gb))
    .eq('active', true)
    .single()

  if (!product) {
    return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 })
  }

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('email, name')
    .eq('id', uid)
    .single()

  if (clientErr || !client?.email) {
    console.error('[pix] cliente não encontrado para uid:', uid, clientErr?.message)
    return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 })
  }

  // Validate coupon server-side from DB
  let appliedCoupon: string | null = null
  let amount = Number(product.price)

  if (coupon) {
    const code = (coupon as string).trim().toUpperCase()
    const { data: couponData } = await supabase
      .from('coupons')
      .select('code, discount_pct, max_uses, uses_count, expires_at')
      .eq('code', code)
      .eq('active', true)
      .single()

    if (couponData) {
      const isExpired   = couponData.expires_at && new Date(couponData.expires_at) < new Date()
      const isExhausted = couponData.max_uses !== null && couponData.uses_count >= couponData.max_uses
      if (!isExpired && !isExhausted) {
        amount = Math.round(Number(product.price) * (1 - Number(couponData.discount_pct)) * 100) / 100
        appliedCoupon = code
      }
    }
  }

  const plan_label = `${gb} GB`

  if (whatsapp) {
    await supabase.from('clients').update({ whatsapp }).eq('id', uid)
  }

  if (!process.env.SMARTPROXY_SESSION_TOKEN) {
    const { count } = await supabase
      .from('proxies')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'available')

    if (!count || count === 0) {
      return NextResponse.json({ error: 'Sem estoque disponível no momento.' }, { status: 409 })
    }
  }

  const meta = Buffer.from(
    JSON.stringify({ uid, gb, plan_label, total_brl: amount, coupon: appliedCoupon })
  ).toString('base64url')

  const hmac = createHmac('sha256', process.env.SYNCPAY_WEBHOOK_SECRET ?? '').update(meta).digest('base64url')
  const webhookUrl = `${APP_URL}/api/pagamento/webhook?m=${meta}&s=${hmac}`

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
