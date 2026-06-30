import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  if (req.headers.get('x-role') !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const supabase = createServerClient()

  const [{ data: clients }, { data: orders }] = await Promise.all([
    supabase.from('clients').select('id,name,email,created_at').order('created_at', { ascending: false }),
    supabase.from('orders').select('client_id,total_brl,status'),
  ])

  const statsMap: Record<string, { orders: number; spent: number }> = {}
  for (const o of orders ?? []) {
    if (!statsMap[o.client_id]) statsMap[o.client_id] = { orders: 0, spent: 0 }
    statsMap[o.client_id].orders++
    if (o.status === 'pago') statsMap[o.client_id].spent += Number(o.total_brl)
  }

  const result = (clients ?? []).map((c: any) => ({
    id:      c.id,
    name:    c.name ?? '',
    email:   c.email,
    joined:  c.created_at,
    orders:  statsMap[c.id]?.orders ?? 0,
    spent:   statsMap[c.id]?.spent ?? 0,
  }))

  return NextResponse.json(result)
}
