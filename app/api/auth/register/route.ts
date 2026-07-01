import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const hdrs = await headers()
    const uid  = hdrs.get('x-uid')
    if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const { name, email } = await req.json() as { name: string; email: string }

    const supabase = createServerClient()
    const { error } = await supabase.from('clients').insert({
      id:    uid,
      email: email,
      name:  name,
    })

    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    sendWelcomeEmail(email, name || email).catch(() => null)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
