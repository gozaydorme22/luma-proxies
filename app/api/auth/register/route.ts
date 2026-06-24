import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { createServerClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('__session')?.value
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const decoded = await adminAuth.verifyIdToken(token)
    const { name, email } = await req.json() as { name: string; email: string }

    const supabase = createServerClient()
    const { error } = await supabase.from('clients').insert({
      id:    decoded.uid,
      email: email,
      name:  name,
    })

    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Envia e-mail de boas-vindas (não bloqueia a resposta se falhar)
    sendWelcomeEmail(email, name || email).catch(() => null)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
