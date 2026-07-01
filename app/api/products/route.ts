import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('products')
    .select('id,name,proxy_type,gb_limit,price,description')
    .eq('active', true)
    .order('gb_limit', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
