import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'luma-proxies'

const JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
  )
)

export interface DecodedIdToken extends JWTPayload {
  uid: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
  firebase?: Record<string, unknown>
}

async function verifyIdToken(token: string): Promise<DecodedIdToken> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer:   `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  })
  return { ...payload, uid: payload.sub as string }
}

export const adminAuth = { verifyIdToken }
