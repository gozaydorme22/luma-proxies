import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

// User releases an inactive proxy back to available stock
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const hdrs = await headers()
  const uid  = hdrs.get('x-uid')
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  // Verify ownership before releasing
  const { data: proxy } = await supabase
    .from('proxies')
    .select('id,assigned_to')
    .eq('id', id)
    .eq('assigned_to', uid)
    .single()

  if (!proxy) return NextResponse.json({ error: 'não encontrada' }, { status: 404 })

  const { error } = await supabase
    .from('proxies')
    .update({ status: 'available', assigned_to: null, sold_at: null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const hdrs = await headers()
  const uid  = hdrs.get('x-uid')
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('proxies')
    .select('*')
    .eq('id', id)
    .eq('assigned_to', uid)
    .single()

  if (error || !data) return NextResponse.json({ error: 'não encontrada' }, { status: 404 })

  return NextResponse.json({
    id:           data.id,
    name:         data.label,
    type:         data.proxy_type,
    country:      data.country,
    status:       data.status === 'sold' ? 'active' : data.status === 'suspended' ? 'suspended' : 'inactive',
    host:         data.host,
    port:         data.port,
    proxyUser:    data.username,
    proxyPass:    data.password,
    allocatedGb:  Number(data.gb_limit),
    usedGb:       Number(data.used_gb),
    soldAt:       data.sold_at,
    createdAt:    data.created_at,
  })
}
