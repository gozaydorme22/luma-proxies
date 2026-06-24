import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const hdrs = await headers()
  const uid  = hdrs.get('x-uid')
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  const { data: proxies } = await supabase
    .from('proxies')
    .select('id, label, proxy_type, gb_limit, used_gb, status')
    .eq('assigned_to', uid)
    .order('sold_at', { ascending: false })

  const items = (proxies ?? []).map((p: any) => ({
    id:      p.id,
    name:    p.label,
    type:    p.proxy_type,
    totalGb: Number(p.gb_limit),
    usedGb:  Number(p.used_gb),
    status:  p.status,
  }))

  // Histórico de uso (placeholder — será preenchido quando API do fornecedor estiver ativa)
  const usage14d = new Array(14).fill(0)

  return NextResponse.json({ usage14d, proxies: items })
}
