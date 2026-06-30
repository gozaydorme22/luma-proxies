import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (req.headers.get('x-role') !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  const { status } = await req.json() as { status: string }

  const VALID = ['cancelado', 'reembolsado', 'pago', 'aguardando_pagamento']
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Fetch the order to get client_id
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id,client_id,status')
    .eq('id', id)
    .single()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
  }

  // Update order status
  const { error: updateErr } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // If cancelling a paid order, release the most recently assigned proxy back to stock
  if (status === 'cancelado' && order.status === 'pago') {
    const { data: proxy } = await supabase
      .from('proxies')
      .select('id')
      .eq('assigned_to', order.client_id)
      .eq('status', 'sold')
      .order('sold_at', { ascending: false })
      .limit(1)
      .single()
    if (proxy) {
      await supabase
        .from('proxies')
        .update({ status: 'available', assigned_to: null, sold_at: null })
        .eq('id', proxy.id)
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (req.headers.get('x-role') !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createServerClient()

  // Fetch order to release proxy if paid
  const { data: order } = await supabase
    .from('orders')
    .select('client_id,status')
    .eq('id', id)
    .single()

  if (order?.status === 'pago') {
    const { data: proxy } = await supabase
      .from('proxies')
      .select('id')
      .eq('assigned_to', order.client_id)
      .eq('status', 'sold')
      .order('sold_at', { ascending: false })
      .limit(1)
      .single()
    if (proxy) {
      await supabase
        .from('proxies')
        .update({ status: 'available', assigned_to: null, sold_at: null })
        .eq('id', proxy.id)
    }
  }

  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
