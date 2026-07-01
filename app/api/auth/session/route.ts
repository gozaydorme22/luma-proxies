import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'

const COOKIE = '__session'

export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({})) as { token?: string }
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 400 })

  try {
    await adminAuth.verifyIdToken(token)
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const SEVEN_DAYS = 60 * 60 * 24 * 7
  const sessionCookie = await adminAuth.createSessionCookie(token, { expiresIn: SEVEN_DAYS })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, sessionCookie, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   SEVEN_DAYS,
    path:     '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(COOKIE)
  return res
}
