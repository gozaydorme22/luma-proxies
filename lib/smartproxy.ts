import https from 'https'
import { HttpProxyAgent } from 'http-proxy-agent'

const BASE         = 'https://www.smartproxy.org/web_v1'
const APP_KEY      = process.env.SMARTPROXY_APP_KEY ?? ''
export const GATEWAY_HOST = process.env.SMARTPROXY_GATEWAY_HOST ?? 'proxy.smartproxy.net'
export const GATEWAY_PORT = Number(process.env.SMARTPROXY_GATEWAY_PORT ?? '3120')
const PRODUCT_TYPE = 9

interface SimpleResponse {
  ok: boolean
  status: number
  text(): Promise<string>
  json(): Promise<unknown>
}

function makeProxyAgent(): HttpProxyAgent<string> | null {
  const user = process.env.SMARTPROXY_ROUTING_USER ?? ''
  const pass = process.env.SMARTPROXY_ROUTING_PASS ?? ''
  if (!user || !pass) {
    console.log('[smartproxy] proxy routing: disabled (no credentials)')
    return null
  }
  console.log('[smartproxy] proxy routing: enabled via http-proxy-agent')
  return new HttpProxyAgent(`http://${user}:${pass}@${GATEWAY_HOST}:${GATEWAY_PORT}`)
}

function nodeRequest(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string },
  agent: HttpProxyAgent<string>,
): Promise<SimpleResponse> {
  return new Promise((resolve, reject) => {
    const u     = new URL(url)
    const data  = init.body ? Buffer.from(init.body, 'utf8') : undefined
    const reqOpts: https.RequestOptions = {
      hostname: u.hostname,
      port:     parseInt(u.port || '443', 10),
      path:     u.pathname + u.search,
      method:   init.method ?? 'GET',
      headers:  {
        ...(init.headers ?? {}),
        ...(data ? { 'Content-Length': String(data.length) } : {}),
      },
      agent,
    }
    const req = https.request(reqOpts, res => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve({
          ok:     (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
          status:  res.statusCode ?? 0,
          text:   async () => text,
          json:   async () => JSON.parse(text) as unknown,
        })
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function apiFetch(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<SimpleResponse> {
  const agent = makeProxyAgent()
  if (agent) {
    return nodeRequest(url, init ?? {}, agent)
  }
  const res = await fetch(url, init as RequestInit)
  const text = await res.text()
  return {
    ok:     res.ok,
    status: res.status,
    text:   async () => text,
    json:   async () => JSON.parse(text) as unknown,
  }
}

function headers(): Record<string, string> {
  return {
    'Content-Type':  'application/json',
    'Accept':        'application/json',
    'app-key':       APP_KEY,
    'Authorization': `Bearer ${APP_KEY}`,
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
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify({ product_type: PRODUCT_TYPE, username, pwd: password, flow_limit: limitGb, day_limit: 0 }),
  })
  if (!res.ok) throw new Error(`SmartProxy createSubAccount ${res.status}: ${await res.text()}`)
  const data = await res.json() as { code: number; msg?: string; data?: unknown }
  if (data.code !== 0 && data.code !== 200) throw new Error(`SmartProxy: ${data.msg ?? JSON.stringify(data)}`)
  return (data.data ?? { username, flow_limit: limitGb }) as SubAccount
}

export async function listSubAccounts(): Promise<SubAccount[]> {
  const res = await apiFetch(
    `${BASE}/whitelist-account/list?language=en&product_type=${PRODUCT_TYPE}`,
    { headers: headers() },
  )
  if (!res.ok) throw new Error(`SmartProxy listSubAccounts ${res.status}: ${await res.text()}`)
  const data = await res.json() as { code: number; msg?: string; data?: unknown[] }
  if (data.code !== 0 && data.code !== 200) throw new Error(`SmartProxy: ${data.msg}`)
  return (data.data ?? []) as SubAccount[]
}

export async function updateSubAccount(username: string, fields: { flow_limit?: number; status?: number }): Promise<void> {
  const res = await apiFetch(`${BASE}/whitelist-account/change?language=en`, {
    method:  'POST',
    headers: headers(),
    body:    JSON.stringify({ product_type: PRODUCT_TYPE, username, ...fields }),
  })
  if (!res.ok) throw new Error(`SmartProxy updateSubAccount ${res.status}: ${await res.text()}`)
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