import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// DELETE /api/admin/orders?status=pago — bulk delete by status (no proxy release)
export async function DELETE(req: NextRequest) {
  if (req.headers.get('x-role') !== 'admin')
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const status = req.nextUrl.searchParams.get('status')
  const supabase = createServerClient()

  // Fetch IDs first so we know what to delete
  let selectQ = supabase.from('orders').select('id')
  if (status) selectQ = selectQ.eq('status', status)
  const { data: rows } = await selectQ

  if (!rows || rows.length === 0) return NextResponse.json({ deleted: 0 })

  const ids = rows.map((r: any) => r.id)
  const { error } = await supabase.from('orders').delete().in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: ids.length })
}

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
