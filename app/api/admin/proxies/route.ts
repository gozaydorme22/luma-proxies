import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

function adminOnly(req: NextRequest) {
  return req.headers.get('x-role') !== 'admin'
}

// GET — lista proxies do estoque (filtra por product_id e/ou status)
export async function GET(req: NextRequest) {
  if (adminOnly(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const supabase = createServerClient()
  const { searchParams } = req.nextUrl
  const status     = searchParams.get('status')
  const product_id = searchParams.get('product_id')

  let query = supabase
    .from('proxies')
    .select('*, clients(email, name)')
    .order('created_at', { ascending: true })

  if (product_id) query = query.eq('product_id', product_id)
  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — cadastrar nova proxy pré-gerada (vinculada a um produto)
export async function POST(req: NextRequest) {
  if (adminOnly(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await req.json()
  const { product_id, host, port, username, password, notes } = body

  if (!product_id || !host || !port || !username || !password) {
    return NextResponse.json({ error: 'Campos obrigatórios: product_id, host, port, username, password' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Busca dados do produto para preencher label, gb_limit, etc.
  const { data: product, error: pErr } = await supabase
    .from('products')
    .select('name, proxy_type, gb_limit, price, cost_price')
    .eq('id', product_id)
    .single()

  if (pErr || !product) return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })

  const { data, error } = await supabase
    .from('proxies')
    .insert({
      product_id,
      label:      product.name,
      proxy_type: product.proxy_type,
      country:    'BR',
      host:       host.trim(),
      port:       Number(port),
      username:   username.trim(),
      password:   password.trim(),
      gb_limit:   product.gb_limit,
      price:      product.price,
      cost_price: product.cost_price ?? null,
      notes:      notes ?? null,
      status:     'available',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
