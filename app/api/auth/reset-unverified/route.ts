import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email: string }
    if (!email) return NextResponse.json({ status: 'invalid' }, { status: 400 })

    const user = await adminAuth.getUserByEmail(email).catch(() => null)
    if (!user) return NextResponse.json({ status: 'not_found' })
    if (user.emailVerified) return NextResponse.json({ status: 'verified' })

    // Conta existe mas nunca foi verificada — apaga para permitir novo cadastro
    await adminAuth.deleteUser(user.uid)

    // Limpa registros órfãos no Supabase
    const supabase = createServerClient()
    await supabase.from('verification_codes').delete().eq('uid', user.uid)
    await supabase.from('clients').delete().eq('id', user.uid)

    return NextResponse.json({ status: 'deleted' })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
