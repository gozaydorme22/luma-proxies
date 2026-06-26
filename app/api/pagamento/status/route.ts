import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getTransaction } from '@/lib/syncpay'

export async function GET(req: NextRequest) {
  const hdrs = await headers()
  const uid  = hdrs.get('x-uid')
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const identifier = req.nextUrl.searchParams.get('id')
  if (!identifier) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    const tx = await getTransaction(identifier)
    return NextResponse.json({ status: tx.status })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao consultar status.'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
