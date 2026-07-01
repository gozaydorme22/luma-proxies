import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'

const PUBLIC_PATHS = [
  '/', '/login', '/cadastro', '/verificar', '/proxy-checker',
  '/api/webhook', '/api/pagamento/webhook', '/api/cron',
  // auth routes that must be reachable before a session cookie exists
  '/api/auth/session', '/api/auth/verify', '/api/auth/reset-unverified',
]
const ADMIN_PREFIX = '/admin'

async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get('__session')?.value
  if (!token) return redirectToLogin(req)

  try {
    const decoded = await adminAuth.verifySessionCookie(token)

    const uid           = decoded.uid
    const role          = decoded['role'] as string | undefined
    const emailVerified = decoded.email_verified

    // Bloqueia acesso ao dashboard/checkout se e-mail não verificado
    if (!emailVerified && (pathname.startsWith('/dashboard') || pathname.startsWith('/checkout'))) {
      return NextResponse.redirect(new URL('/verificar', req.url))
    }

    if (pathname.startsWith(ADMIN_PREFIX) && role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url))
    }

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-uid', uid)
    requestHeaders.set('x-role', role ?? 'client')
    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    return redirectToLogin(req)
  }
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.searchParams.set('redirect', req.nextUrl.pathname)
  return NextResponse.redirect(url)
}

export default proxy

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
