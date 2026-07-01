// SmartProxy management API — authenticates via session login (not app_key)
// CF bypass: ua-sec + Hash headers (confirmed working from server IPs)
// Token lasts 7 days; re-login on cold start or expiry
import { randomBytes } from 'crypto'

export const GATEWAY_HOST = process.env.SMARTPROXY_GATEWAY_HOST ?? 'proxy.smartproxy.net'
export const GATEWAY_PORT = Number(process.env.SMARTPROXY_GATEWAY_PORT ?? '3120')

const BASE         = 'https://www.smartproxy.org/web_v1'
const PRODUCT_TYPE = 9

// Module-level token cache (survives within a Vercel function instance lifetime)
let _token: string | null = null
let _tokenExpiry = 0

// Headers required to bypass Cloudflare WAF on smartproxy.org
function cfHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type':  'application/json',
    'Accept':        'application/json',
    'ua-sec':        'https://www.smartproxy.org',
    'Hash':          'SmartProxy.org',
    'Origin':        'https://www.smartproxy.org',
    'Referer':       'https://www.smartproxy.org/',
    'User-Agent':    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

async function getToken(): Promise<string> {
  // Use static session token if set (extracted from browser, avoids Turnstile on login)
  const staticToken = process.env.SMARTPROXY_SESSION_TOKEN
  if (staticToken) {
    console.log('[smartproxy] using static session token')
    return staticToken
  }

  if (_token && Date.now() < _tokenExpiry) return _token

  throw new Error('[smartproxy] SMARTPROXY_SESSION_TOKEN not set. Extract the VE9LRU4 cookie from your logged-in SmartProxy browser session and add it as SMARTPROXY_SESSION_TOKEN in .env.local and Vercel.')
}

async function apiFetch(
  url: string,
  init?: { method?: string; body?: string },
): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> {
  const token = await getToken()
  const res   = await fetch(url, {
    method:  init?.method ?? 'GET',
    headers: cfHeaders(token),
    body:    init?.body,
  })
  const text = await res.text()
  return {
    ok:     res.ok,
    status: res.status,
    json:   async () => JSON.parse(text) as unknown,
  }
}

// Real field names/units as returned by whitelist-account/list (reverse-engineered from the dashboard bundle)
export interface SubAccount {
  username:          string
  password?:         string
  limit_flow?:       number // KB; 0 = unlimited
  daily_limit_flow?: number // KB
  usage_flow?:       number // KB
  status?:           number
}

export async function createSubAccount(username: string, password: string, limitGb: number): Promise<SubAccount> {
  // API expects credentials as a single "user:pass" string under `accounts`, and `limit`/`daily_limit` in GB
  // (reverse-engineered from the dashboard's add-subaccount form — `flow_limit`/`pwd` fields don't exist on this endpoint)
  const body = { accounts: `${username}:${password}`, product_type: PRODUCT_TYPE, limit: limitGb, daily_limit: 0, remark: '' }
  console.log('[smartproxy] createSubAccount body:', JSON.stringify(body))
  const res = await apiFetch(`${BASE}/whitelist-account/add?language=en`, {
    method: 'POST',
    body:   JSON.stringify(body),
  })
  const data = await res.json() as { code: number; msg?: string; data?: unknown }
  console.log('[smartproxy] createSubAccount response:', JSON.stringify(data).slice(0, 300))
  if (data.code !== 0 && data.code !== 200) throw new Error(`SmartProxy: ${data.msg ?? JSON.stringify(data)}`)
  // The add endpoint returns no data — SmartProxy prepends "smart-" to whatever username we sent
  return { username: `smart-${username}`, limit_flow: limitGb * 1024 * 1024 }
}

export async function listSubAccounts(): Promise<SubAccount[]> {
  const res = await apiFetch(`${BASE}/whitelist-account/list?language=en&product_type=${PRODUCT_TYPE}`)
  const data = await res.json() as { code: number; msg?: string; data?: unknown }
  console.log('[smartproxy] listSubAccounts raw:', JSON.stringify(data).slice(0, 300))
  if (!res.ok || (data.code !== 0 && data.code !== 200)) throw new Error(`SmartProxy listSubAccounts: ${data.msg ?? data.code}`)
  // data.data may be an array or an object with a list field
  const list = Array.isArray(data.data) ? data.data : (data.data as { list?: unknown[] })?.list ?? []
  return list as SubAccount[]
}

export async function updateSubAccount(username: string, fields: { limitGb?: number; status?: number }): Promise<void> {
  // change endpoint expects the FULL username (with "smart-" prefix) under `account`, and `limit` in GB
  const fullUsername = username.startsWith('smart-') ? username : `smart-${username}`
  const body: Record<string, unknown> = { product_type: PRODUCT_TYPE, account: fullUsername, remark: '', daily_limit: 0 }
  if (fields.limitGb !== undefined) body.limit = fields.limitGb
  if (fields.status !== undefined) body.status = fields.status
  console.log('[smartproxy] updateSubAccount body:', JSON.stringify(body))
  const res = await apiFetch(`${BASE}/whitelist-account/change?language=en`, {
    method: 'POST',
    body:   JSON.stringify(body),
  })
  const data = await res.json() as { code: number; msg?: string }
  console.log('[smartproxy] updateSubAccount response:', JSON.stringify(data).slice(0, 200))
  if (data.code !== 0 && data.code !== 200) throw new Error(`SmartProxy: ${data.msg}`)
}

export function kbToGb(kb: number): number { return kb / 1024 / 1024 }

export function makeUsername(uid: string): string {
  // SmartProxy username limit: 12 chars max ("luma" = 4, so 8 from uid)
  return `luma${uid.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase()}`
}

// Connection username for proxy clients on proxy.smartproxy.net:3120.
// This gateway authenticates with the base username only — the -country-XX suffix
// is not supported on this endpoint and causes auth failures.
export function connectionUsername(baseUsername: string, countryCode: string | null = null): string {
  const full = baseUsername.startsWith('smart-') ? baseUsername : `smart-${baseUsername}`
  return countryCode ? `${full}-country-${countryCode}` : full
}

// Strip -country-XX suffix to recover the management username for SmartProxy API lookups
export function mgmtUsername(username: string): string {
  return username.replace(/-country-[a-z]{2}$/, '')
}

export function makePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = randomBytes(16)
  let out = ''
  for (const b of bytes) out += chars[b % chars.length]
  return out
}
