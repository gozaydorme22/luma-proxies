import { ProxyAgent, fetch as undiciFetch } from 'undici'

const BASE         = 'https://www.smartproxy.org/web_v1'
const APP_KEY      = process.env.SMARTPROXY_APP_KEY ?? ''
export const GATEWAY_HOST = process.env.SMARTPROXY_GATEWAY_HOST ?? 'proxy.smartproxy.net'
export const GATEWAY_PORT = Number(process.env.SMARTPROXY_GATEWAY_PORT ?? '3120')
const PRODUCT_TYPE = 9

let _agent: ProxyAgent | null | undefined = undefined

function getAgent(): ProxyAgent | null {
  if (_agent !== undefined) return _agent
  const user = process.env.SMARTPROXY_ROUTING_USER ?? ''
  const pass = process.env.SMARTPROXY_ROUTING_PASS ?? ''
  _agent = (user && pass)
    ? new ProxyAgent(`http://${user}:${pass}@${GATEWAY_HOST}:${GATEWAY_PORT}`)
    : null
  console.log('[smartproxy] proxy routing:', _agent ? 'enabled' : 'disabled (direct)')
  return _agent
}

async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const agent = getAgent()
  if (agent) {
    return undiciFetch(url, {
      ...(init as Parameters<typeof undiciFetch>[1]),
      dispatcher: agent,
    }) as unknown as Response
  }
  return fetch(url, init)
}

function headers() {
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
  const data = await res.json()
  if (data.code !== 0 && data.code !== 200) throw new Error(`SmartProxy: ${data.msg ?? JSON.stringify(data)}`)
  return (data.data ?? { username, flow_limit: limitGb }) as SubAccount
}

export async function listSubAccounts(): Promise<SubAccount[]> {
  const res = await apiFetch(
    `${BASE}/whitelist-account/list?language=en&product_type=${PRODUCT_TYPE}`,
    { headers: headers() },
  )
  if (!res.ok) throw new Error(`SmartProxy listSubAccounts ${res.status}: ${await res.text()}`)
  const data = await res.json()
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
  const data = await res.json()
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