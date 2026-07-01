import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

function adminOnly(req: NextRequest) {
  return req.headers.get('x-role') !== 'admin'
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (adminOnly(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const allowed = ['code', 'discount_pct', 'max_uses', 'active', 'expires_at']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('coupons')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (adminOnly(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { id } = await params
  const supabase = createServerClient()
  const { error } = await supabase.from('coupons').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
