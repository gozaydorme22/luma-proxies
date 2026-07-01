import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const hdrs = await headers()
    const uid  = hdrs.get('x-uid')
    if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const { code } = await req.json() as { code: string }

    const supabase = createServerClient()

    const { data: row } = await supabase
      .from('verification_codes')
      .select('id, code, expires_at, used')
      .eq('uid', uid)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!row) return NextResponse.json({ error: 'Código não encontrado.' }, { status: 400 })
    if (row.used) return NextResponse.json({ error: 'Código já utilizado.' }, { status: 400 })
    if (new Date(row.expires_at) < new Date()) return NextResponse.json({ error: 'Código expirado. Solicite um novo.' }, { status: 400 })
    if (row.code !== code) {
      await supabase.from('verification_codes').update({ used: true }).eq('id', row.id)
      return NextResponse.json({ error: 'Código incorreto. Solicite um novo.' }, { status: 400 })
    }

    await supabase.from('verification_codes').update({ used: true }).eq('id', row.id)
    await adminAuth.updateUser(uid, { emailVerified: true })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
