import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('__session')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const { code } = await req.json() as { code: string }

    const supabase = createServerClient()

    const { data: row } = await supabase
      .from('verification_codes')
      .select('id, code, expires_at, used')
      .eq('uid', decoded.uid)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!row) return NextResponse.json({ error: 'Código não encontrado.' }, { status: 400 })
    if (row.used) return NextResponse.json({ error: 'Código já utilizado.' }, { status: 400 })
    if (new Date(row.expires_at) < new Date()) return NextResponse.json({ error: 'Código expirado. Solicite um novo.' }, { status: 400 })
    if (row.code !== code) return NextResponse.json({ error: 'Código incorreto.' }, { status: 400 })

    // Marca como usado
    await supabase.from('verification_codes').update({ used: true }).eq('id', row.id)

    // Marca e-mail como verificado no Firebase
    await adminAuth.updateUser(decoded.uid, { emailVerified: true })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
