import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

function adminOnly(req: NextRequest) {
  return req.headers.get('x-role') !== 'admin'
}

// PATCH — atualizar proxy (preço, status, used_gb, notas)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (adminOnly(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const allowed = ['label', 'price', 'cost_price', 'status', 'used_gb', 'notes', 'gb_limit', 'assigned_to', 'sold_at']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('proxies')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE — remover proxy do estoque (só se não vendida)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (adminOnly(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const supabase = createServerClient()

  const { data: proxy } = await supabase.from('proxies').select('status').eq('id', id).single()
  if (proxy?.status === 'sold') {
    return NextResponse.json({ error: 'Não é possível remover uma proxy já vendida.' }, { status: 409 })
  }

  const { error } = await supabase.from('proxies').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
