import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  if (req.headers.get('x-role') !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('orders')
    .select('id,client_id,quantity,total_brl,status,payment_method,paid_at,created_at,clients(name,email)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = (data ?? []).map((o: any) => ({
    id:            o.id,
    clientId:      o.client_id,
    clientName:    o.clients?.name ?? '—',
    clientEmail:   o.clients?.email ?? '',
    quantity:      o.quantity,
    totalBrl:      Number(o.total_brl),
    status:        o.status,
    paymentMethod: o.payment_method,
    paidAt:        o.paid_at,
    createdAt:     o.created_at,
  }))

  return NextResponse.json(result)
}
