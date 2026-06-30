import { createRemoteJWKSet, jwtVerify, JWTPayload, SignJWT, importPKCS8 } from 'jose'

const PROJECT_ID    = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'luma-proxies'
const CLIENT_EMAIL  = process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? ''
const PRIVATE_KEY   = (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
)

export interface DecodedIdToken extends JWTPayload {
  uid: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
  firebase?: Record<string, unknown>
}

export interface UserRecord {
  uid: string
  email?: string
  emailVerified: boolean
  displayName?: string
  disabled: boolean
}

async function getAccessToken(): Promise<string> {
  const key  = await importPKCS8(PRIVATE_KEY, 'RS256')
  const now  = Math.floor(Date.now() / 1000)
  const jwt  = await new SignJWT({ scope: 'https://www.googleapis.com/auth/cloud-platform' })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(CLIENT_EMAIL)
    .setSubject(CLIENT_EMAIL)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  })
  const { access_token } = await res.json() as { access_token: string }
  return access_token
}

const BASE = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}`

async function verifyIdToken(token: string): Promise<DecodedIdToken> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer:   `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  })
  return { ...payload, uid: payload.sub as string }
}

async function getUserByEmail(email: string): Promise<UserRecord> {
  const token = await getAccessToken()
  const res   = await fetch(`${BASE}/accounts:lookup`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email }),
  })
  if (!res.ok) throw new Error(`getUserByEmail HTTP ${res.status}`)
  const data = await res.json() as { users?: Record<string, unknown>[] }
  const u    = data.users?.[0]
  if (!u) throw new Error('User not found')
  return {
    uid:          u.localId as string,
    email:        u.email as string | undefined,
    emailVerified: Boolean(u.emailVerified),
    displayName:  u.displayName as string | undefined,
    disabled:     Boolean(u.disabled),
  }
}

async function deleteUser(uid: string): Promise<void> {
  const token = await getAccessToken()
  const res   = await fetch(`${BASE}/accounts:delete`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ localId: uid }),
  })
  if (!res.ok) throw new Error(`deleteUser HTTP ${res.status}`)
}

async function updateUser(uid: string, updates: { emailVerified?: boolean; displayName?: string }): Promise<void> {
  const token = await getAccessToken()
  const res   = await fetch(`${BASE}/accounts:update`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ localId: uid, ...updates }),
  })
  if (!res.ok) throw new Error(`updateUser HTTP ${res.status}`)
}

export const adminAuth = { verifyIdToken, getUserByEmail, deleteUser, updateUser }