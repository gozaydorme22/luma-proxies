import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

function adminOnly(req: NextRequest) {
  return req.headers.get('x-role') !== 'admin'
}

export async function GET(req: NextRequest) {
  if (adminOnly(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (adminOnly(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json()
  const { code, discount_pct, max_uses, expires_at, single_use_per_user } = body

  if (!code || discount_pct === undefined || discount_pct === '') {
    return NextResponse.json({ error: 'Código e desconto são obrigatórios.' }, { status: 400 })
  }

  const pct = Number(discount_pct)
  if (isNaN(pct) || pct <= 0 || pct >= 1) {
    return NextResponse.json({ error: 'Desconto deve ser entre 0.01 e 0.99 (ex: 0.10 = 10%).' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('coupons')
    .insert({
      code:                code.trim().toUpperCase(),
      discount_pct:        pct,
      max_uses:            max_uses ? Number(max_uses) : null,
      expires_at:          expires_at || null,
      active:              true,
      single_use_per_user: single_use_per_user === true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
