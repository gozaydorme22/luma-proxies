// SmartProxy management API — authenticates via session login (not app_key)
// CF bypass: ua-sec + Hash headers (confirmed working from server IPs)
// Token lasts 7 days; re-login on cold start or expiry

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

export interface SubAccount {
  username:    string
  pwd?:        string
  flow_limit?: number
  day_limit?:  number
  flow_used?:  number
  status?:     number
}

export async function createSubAccount(username: string, password: string, limitGb: number): Promise<SubAccount> {
  const res = await apiFetch(`${BASE}/whitelist-account/add?language=en`, {
    method: 'POST',
    body:   JSON.stringify({ product_type: PRODUCT_TYPE, username, pwd: password, flow_limit: limitGb, day_limit: 0 }),
  })
  if (!res.ok) {
    const t = await res.json() as { code: number; msg?: string }
    throw new Error(`SmartProxy createSubAccount ${res.status}: ${t.msg ?? JSON.stringify(t)}`)
  }
  const data = await res.json() as { code: number; msg?: string; data?: unknown }
  if (data.code !== 0 && data.code !== 200) throw new Error(`SmartProxy: ${data.msg ?? JSON.stringify(data)}`)
  return (data.data ?? { username, flow_limit: limitGb }) as SubAccount
}

export async function listSubAccounts(): Promise<SubAccount[]> {
  const res = await apiFetch(`${BASE}/whitelist-account/list?language=en&product_type=${PRODUCT_TYPE}`)
  if (!res.ok) {
    const t = await res.json() as { code: number; msg?: string }
    throw new Error(`SmartProxy listSubAccounts ${res.status}: ${t.msg}`)
  }
  const data = await res.json() as { code: number; msg?: string; data?: unknown[] }
  if (data.code !== 0 && data.code !== 200) throw new Error(`SmartProxy: ${data.msg}`)
  return (data.data ?? []) as SubAccount[]
}

export async function updateSubAccount(username: string, fields: { flow_limit?: number; status?: number }): Promise<void> {
  const res = await apiFetch(`${BASE}/whitelist-account/change?language=en`, {
    method: 'POST',
    body:   JSON.stringify({ product_type: PRODUCT_TYPE, username, ...fields }),
  })
  if (!res.ok) {
    const t = await res.json() as { code: number; msg?: string }
    throw new Error(`SmartProxy updateSubAccount ${res.status}: ${t.msg}`)
  }
  const data = await res.json() as { code: number; msg?: string }
  if (data.code !== 0 && data.code !== 200) throw new Error(`SmartProxy: ${data.msg}`)
}

export function mbToGb(mb: number): number { return mb / 1024 }

export function makeUsername(uid: string): string {
  return `luma${uid.replace(/[^a-z0-9]/gi, '').slice(0, 10).toLowerCase()}`
}

export function makePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < 16; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}
