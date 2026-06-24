import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

function adminOnly(req: NextRequest) {
  return req.headers.get('x-role') !== 'admin'
}

// GET — catálogo de produtos com contagem de estoque
export async function GET(req: NextRequest) {
  if (adminOnly(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('stock_by_product')
    .select('*')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — criar novo produto no catálogo
export async function POST(req: NextRequest) {
  if (adminOnly(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, proxy_type, gb_limit, price, cost_price, description, sort_order } = body

  if (!name || !gb_limit || !price) {
    return NextResponse.json({ error: 'name, gb_limit e price são obrigatórios.' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('products')
    .insert({
      name,
      proxy_type:  proxy_type  ?? 'residential_rotating',
      gb_limit:    Number(gb_limit),
      price:       Number(price),
      cost_price:  cost_price ? Number(cost_price) : null,
      description: description ?? null,
      sort_order:  sort_order  ? Number(sort_order) : 0,
      active:      true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
