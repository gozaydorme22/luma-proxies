import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json() as { token?: string }

    if (!token) {
      return NextResponse.json({ error: 'no token' }, { status: 401 })
    }

    const decoded = await adminAuth.verifyIdToken(token)
    const role    = (decoded as Record<string, unknown>)['role'] as string | undefined

    return NextResponse.json({ uid: decoded.uid, role: role ?? null })
  } catch {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 })
  }
}
