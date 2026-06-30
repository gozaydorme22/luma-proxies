// SmartProxy.org integration
// Gateway confirmed: proxy.smartproxy.net:3120 (User/Pass auth)
// Sub-accounts are called "whitelist-account" in their API

const BASE     = 'https://www.smartproxy.org/web_v1'
const APP_KEY  = process.env.SMARTPROXY_APP_KEY ?? ''

export const GATEWAY_HOST = process.env.SMARTPROXY_GATEWAY_HOST ?? 'proxy.smartproxy.net'
export const GATEWAY_PORT = Number(process.env.SMARTPROXY_GATEWAY_PORT ?? '3120')

// product_type=9 = Residential Rotating
const PRODUCT_TYPE = 9

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
  flow_limit?: number  // GB — traffic upper limit
  day_limit?:  number  // GB — daily limit (0 = unlimited)
  flow_used?:  number  // MB — total usage
  status?:     number  // 1 = enabled, 0 = disabled
}

export async function createSubAccount(
  username: string,
  password: string,
  limitGb:  number,
): Promise<SubAccount> {
  const res = await fetch(`${BASE}/whitelist-account/add?language=en`, {
    method:  'POST',
    headers: headers(),
    body: JSON.stringify({
      product_type: PRODUCT_TYPE,
      username,
      pwd:        password,
      flow_limit: limitGb,
      day_limit:  0,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`SmartProxy createSubAccount ${res.status}: ${body}`)
  }
  const data = await res.json()
  if (data.code !== 0 && data.code !== 200) throw new Error(`SmartProxy: ${data.msg ?? JSON.stringify(data)}`)
  return (data.data ?? { username, flow_limit: limitGb }) as SubAccount
}

export async function listSubAccounts(): Promise<SubAccount[]> {
  const res = await fetch(
    `${BASE}/whitelist-account/list?language=en&product_type=${PRODUCT_TYPE}`,
    { headers: headers() },
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`SmartProxy listSubAccounts ${res.status}: ${body}`)
  }
  const data = await res.json()
  if (data.code !== 0 && data.code !== 200) throw new Error(`SmartProxy: ${data.msg}`)
  return (data.data ?? []) as SubAccount[]
}

export async function updateSubAccount(
  username: string,
  fields: { flow_limit?: number; status?: number },
): Promise<void> {
  const res = await fetch(`${BASE}/whitelist-account/change?language=en`, {
    method:  'POST',
    headers: headers(),
    body: JSON.stringify({ product_type: PRODUCT_TYPE, username, ...fields }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`SmartProxy updateSubAccount ${res.status}: ${body}`)
  }
  const data = await res.json()
  if (data.code !== 0 && data.code !== 200) throw new Error(`SmartProxy: ${data.msg}`)
}

/** usage_flow returned in MB — convert to GB */
export function mbToGb(mb: number): number {
  return mb / 1024
}

/** Generate a unique sub-account username from a Firebase UID */
export function makeUsername(uid: string): string {
  // SmartProxy usernames: letters/numbers, max ~20 chars
  return `luma${uid.replace(/[^a-z0-9]/gi, '').slice(0, 10).toLowerCase()}`
}

/** Generate a random 16-char alphanumeric password */
export function makePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < 16; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}
