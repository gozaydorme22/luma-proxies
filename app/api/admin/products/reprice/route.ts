import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// One-shot: set exact new prices for each gb_limit
const PRICE_MAP: Record<number, number> = {
  3:  24.90,
  5:  41.90,
  10: 79.90,
  20: 157.90,
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-role') !== 'admin')
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const supabase = createServerClient()

  const { data: products } = await supabase
    .from('products')
    .select('id, name, gb_limit, price')

  if (!products?.length) return NextResponse.json({ updated: 0 })

  const results = []
  for (const p of products) {
    const newPrice = PRICE_MAP[p.gb_limit]
    if (!newPrice) continue
    const { error } = await supabase
      .from('products')
      .update({ price: newPrice })
      .eq('id', p.id)
    results.push({ name: p.name, gb: p.gb_limit, old: p.price, new: newPrice, ok: !error })
  }

  return NextResponse.json({ updated: results.length, results })
}
