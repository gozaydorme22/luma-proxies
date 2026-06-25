import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const hdrs = await headers()
  const uid  = hdrs.get('x-uid')
  if (!uid) return NextResponse.json({ eligible: false })

  const supabase = createServerClient()
  const { data } = await supabase
    .from('clients')
    .select('first_purchase_coupon_used')
    .eq('id', uid)
    .single()

  return NextResponse.json({ eligible: data ? data.first_purchase_coupon_used === false : false })
}
