import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

export async function POST() {
  const hdrs = await headers()
  const uid  = hdrs.get('x-uid')
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  // Verify eligibility before marking as used
  const { data } = await supabase
    .from('clients')
    .select('first_purchase_coupon_used')
    .eq('id', uid)
    .single()

  if (!data || data.first_purchase_coupon_used !== false) {
    return NextResponse.json({ error: 'Cupom não disponível ou já utilizado.' }, { status: 409 })
  }

  // Atomic update: only succeeds if coupon is still unused
  const { error } = await supabase
    .from('clients')
    .update({ first_purchase_coupon_used: true })
    .eq('id', uid)
    .eq('first_purchase_coupon_used', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
