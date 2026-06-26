import { NextRequest, NextResponse } from 'next/server'
import http from 'node:http'
import { HttpProxyAgent } from 'http-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'

export interface ProxyResult {
  raw: string
  host: string
  port: number
  exitIp: string | null
  status: 'success' | 'fail'
  latency: number | null
  country: string | null
  countryCode: string | null
  city: string | null
  region: string | null
  isp: string | null
  anonymous: boolean
  error?: string
}

function parseProxy(raw: string) {
  const s = raw.trim()
  if (!s) return null

  let type = 'http'
  let rest = s

  if (/^socks5:\/\//i.test(s)) { type = 'socks5h'; rest = s.slice(9) }
  else if (/^socks4:\/\//i.test(s)) { type = 'socks4'; rest = s.slice(9) }
  else if (/^https?:\/\//i.test(s)) { rest = s.replace(/^https?:\/\//i, '') }

  let user = '', pass = '', hostPort = rest
  const atIdx = rest.lastIndexOf('@')
  if (atIdx !== -1) {
    const auth = rest.slice(0, atIdx)
    hostPort = rest.slice(atIdx + 1)
    const ci = auth.indexOf(':')
    user = ci !== -1 ? auth.slice(0, ci) : auth
    pass = ci !== -1 ? auth.slice(ci + 1) : ''
  }

  const parts = hostPort.split(':')
  let host = parts[0]
  let port = parseInt(parts[1] ?? '')

  // IP:PORT:USER:PASS format
  if (parts.length === 4 && !user) {
    host = parts[0]
    port = parseInt(parts[1])
    user = parts[2]
    pass = parts[3]
  }

  if (!host || !port || isNaN(port)) return null

  const authStr = user ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : ''
  const proxyUrl = `${type}://${authStr}${host}:${port}`

  return { type, host, port, proxyUrl, raw: s }
}

function fetchThroughProxy(proxyUrl: string, isSocks: boolean): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const agent = isSocks
      ? new SocksProxyAgent(proxyUrl)
      : new HttpProxyAgent(proxyUrl)

    const req = http.get(
      'http://ip-api.com/json?fields=status,message,country,countryCode,regionName,city,isp,query',
      { agent: agent as unknown as http.Agent, timeout: 12000 },
      (res) => {
        let body = ''
        res.on('data', (chunk: Buffer) => { body += chunk.toString() })
        res.on('end', () => {
          try { resolve(JSON.parse(body)) }
          catch { reject(new Error('Resposta inválida')) }
        })
      }
    )
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout (12s)')) })
  })
}

async function testProxy(raw: string): Promise<ProxyResult> {
  const base: ProxyResult = {
    raw, host: '', port: 0, exitIp: null, status: 'fail',
    latency: null, country: null, countryCode: null,
    city: null, region: null, isp: null, anonymous: false,
  }

  const parsed = parseProxy(raw)
  if (!parsed) return { ...base, error: 'Formato inválido' }

  const { host, port, type, proxyUrl } = parsed
  const isSocks = type.startsWith('socks')
  const start = Date.now()

  try {
    const data = await fetchThroughProxy(proxyUrl, isSocks)
    const latency = Date.now() - start

    if (data.status === 'fail') {
      return { ...base, host, port, latency, error: (data.message as string) || 'Falha na verificação' }
    }

    return {
      raw, host, port,
      exitIp: data.query as string,
      status: 'success',
      latency,
      country: data.country as string,
      countryCode: data.countryCode as string,
      city: data.city as string,
      region: data.regionName as string,
      isp: data.isp as string,
      anonymous: true,
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro de conexão'
    return { ...base, host, port, error: msg }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { proxies } = await req.json() as { proxies: string[] }
    if (!Array.isArray(proxies) || !proxies.length) {
      return NextResponse.json({ error: 'Nenhuma proxy fornecida' }, { status: 400 })
    }
    const results = await Promise.all(
      proxies.filter(Boolean).slice(0, 10).map(testProxy)
    )
    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
