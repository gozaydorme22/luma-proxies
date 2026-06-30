import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const hdrs = await headers()
  const uid  = hdrs.get('x-uid')
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('orders')
    .select('id,quantity,total_brl,status,payment_method,paid_at,created_at')
    .eq('client_id', uid)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const orders = (data ?? []).map((o: any) => ({
    id:          o.id,
    productName: 'Proxy Residencial Rotativa',
    productType: 'residencial',
    unit:        'gb',
    quantity:    o.quantity,
    totalBrl:    o.total_brl,
    status:      o.status as string,
    paidAt:      o.paid_at,
    createdAt:   o.created_at,
  }))

  return NextResponse.json({ orders })
}
