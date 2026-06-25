import { NextRequest, NextResponse } from 'next/server'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const FIREBASE_PROJECT_ID = 'luma-proxies'
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
)

const PUBLIC_PATHS = ['/', '/login', '/cadastro', '/verificar', '/api/webhook', '/api/auth']
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
    const { payload } = await jwtVerify(token, JWKS, {
      issuer:   `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    })

    const uid           = payload['sub'] as string
    const role          = payload['role'] as string | undefined
    const emailVerified = payload['email_verified'] as boolean | undefined

    // Bloqueia acesso ao dashboard/checkout se e-mail não verificado
    if (!emailVerified && (pathname.startsWith('/dashboard') || pathname.startsWith('/checkout'))) {
      return NextResponse.redirect(new URL('/verificar', req.url))
    }

    if (pathname.startsWith(ADMIN_PREFIX) && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
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
