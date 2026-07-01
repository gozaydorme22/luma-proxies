import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const hdrs = await headers()
  const uid  = hdrs.get('x-uid')
  if (!uid) return NextResponse.json({ valid: false, error: 'Não autenticado.' })

  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase()
  if (!code) return NextResponse.json({ valid: false, error: 'Código não informado.' })

  const supabase = createServerClient()
  const { data: coupon } = await supabase
    .from('coupons')
    .select('id, code, discount_pct, max_uses, uses_count, active, expires_at')
    .eq('code', code)
    .eq('active', true)
    .single()

  if (!coupon) return NextResponse.json({ valid: false, error: 'Cupom inválido ou inativo.' })

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'Cupom expirado.' })
  }
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return NextResponse.json({ valid: false, error: 'Cupom esgotado.' })
  }

  return NextResponse.json({ valid: true, discount_pct: Number(coupon.discount_pct), code: coupon.code })
}
