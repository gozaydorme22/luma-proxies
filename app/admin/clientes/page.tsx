'use client'

import { useState, useEffect } from 'react'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Search, ChevronDown } from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string
  joined: string
  orders: number
  spent: number
}

interface Proxy {
  id: string
  host: string
  port: number
  username: string
  password: string
  status: string
  gb_limit: number
  used_gb: number
  label: string
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

const AC  = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

export default function ClientesPage() {
  const [clients, setClients]   = useState<Client[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  // expanded[clientId] = proxy list or null (loading)
  const [expanded, setExpanded]         = useState<Record<string, Proxy[] | null>>({})
  const [loadingPx, setLoadingPx]       = useState<Record<string, boolean>>({})
  const [checkMap, setCheckMap]         = useState<Record<string, 'checking' | 'ok' | 'fail'>>({})

  useEffect(() => {
    fetch('/api/admin/clients')
      .then(r => r.json())
      .then(d => setClients(Array.isArray(d) ? d : []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false))
  }, [])

  async function toggleClient(client: Client) {
    if (expanded[client.id] !== undefined) {
      setExpanded(e => { const n = { ...e }; delete n[client.id]; return n })
      return
    }

    setLoadingPx(l => ({ ...l, [client.id]: true }))
    setExpanded(e => ({ ...e, [client.id]: null }))

    const res  = await fetch(`/api/admin/proxies?assigned_to=${client.id}`)
    const data = res.ok ? await res.json() : []
    const proxies: Proxy[] = Array.isArray(data) ? data : []
    setExpanded(e => ({ ...e, [client.id]: proxies }))
    setLoadingPx(l => ({ ...l, [client.id]: false }))

    // auto-check all proxies for this client
    if (proxies.length > 0) {
      proxies.forEach(px => checkProxy(px))
    }
  }

  async function checkProxy(px: Proxy) {
    setCheckMap(m => ({ ...m, [px.id]: 'checking' }))
    try {
      const res = await fetch('/api/proxy-check', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ proxies: [`${px.host}:${px.port}:${px.username}:${px.password}`] }),
      })
      const results: Array<{ status: string }> = res.ok ? await res.json() : []
      setCheckMap(m => ({ ...m, [px.id]: results[0]?.status === 'success' ? 'ok' : 'fail' }))
    } catch {
      setCheckMap(m => ({ ...m, [px.id]: 'fail' }))
    }
  }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  })

  return (
    <DashboardShell isAdmin userName="Admin">
      <TopBar title="Clientes" sub={loading ? 'Carregando...' : `${clients.length} clientes cadastrados`} />
      <div className="p-6 flex flex-col gap-4">
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          left={<Search size={14} />}
        />

        <Card padded={false}>
          {loading ? (
            <p className="text-center text-(--text-faint) text-sm py-10">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-(--text-faint) text-sm py-10">Nenhum cliente encontrado.</p>
          ) : (
            <div>
              {filtered.map((c, idx) => {
                const isOpen   = expanded[c.id] !== undefined
                const proxies  = expanded[c.id] ?? []
                const isPxLoading = loadingPx[c.id]

                return (
                  <div key={c.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,.06)' : 'none' }}>

                    {/* LINHA DO CLIENTE */}
                    <div
                      onClick={() => toggleClient(c)}
                      style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 90px 32px', gap: 8, alignItems: 'center', padding: '14px 20px', cursor: 'pointer', transition: 'background .15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Cliente */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${AC2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#0a0612', flexShrink: 0 }}>
                          {(c.name || c.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#f4f2f8' }}>{c.name || '—'}</div>
                          <div style={{ fontSize: 11.5, color: 'rgba(244,242,248,.4)' }}>{c.email}</div>
                        </div>
                      </div>

                      {/* Pedidos */}
                      <div style={{ fontSize: 13, color: 'rgba(244,242,248,.55)', textAlign: 'center' }}>{c.orders}</div>

                      {/* Total */}
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f4f2f8' }}>{fmtBRL(c.spent)}</div>

                      {/* Cadastro */}
                      <div style={{ fontSize: 11.5, color: 'rgba(244,242,248,.4)' }}>{fmtDate(c.joined)}</div>

                      {/* Chevron */}
                      <div style={{ color: 'rgba(244,242,248,.35)', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none', display: 'flex', justifyContent: 'center' }}>
                        <ChevronDown size={14} />
                      </div>
                    </div>

                    {/* PROXIES DO CLIENTE */}
                    {isOpen && (
                      <div style={{ padding: '0 20px 16px 64px', background: 'rgba(0,0,0,.12)' }}>
                        {isPxLoading ? (
                          <div style={{ fontSize: 12, color: 'rgba(244,242,248,.3)', padding: '12px 0' }}>Carregando proxies...</div>
                        ) : proxies.length === 0 ? (
                          <div style={{ fontSize: 12, color: 'rgba(244,242,248,.3)', padding: '12px 0' }}>Nenhuma proxy atribuída.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                            {proxies.map(px => {
                              const check = checkMap[px.id]
                              const alive = check === 'ok'
                              const dotColor = check === 'ok' ? '#34d399' : check === 'fail' ? '#f87171' : '#fbbf24'
                              const dotLabel = check === 'ok' ? 'ativa' : check === 'fail' ? 'inativa' : 'verificando...'

                              return (
                                <div key={px.id} style={{ background: 'rgba(255,255,255,.03)', border: `1px solid ${alive ? 'rgba(52,211,153,.15)' : check === 'fail' ? 'rgba(248,113,113,.15)' : 'rgba(255,255,255,.06)'}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                                    {/* status dot */}
                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, boxShadow: check ? `0 0 5px ${dotColor}` : 'none', flexShrink: 0, display: 'inline-block', animation: check === 'checking' ? 'pulse 1s infinite' : 'none' }} />
                                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'rgba(244,242,248,.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {px.host}:{px.port}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'rgba(244,242,248,.4)', fontFamily: "'JetBrains Mono',monospace", whiteSpace: 'nowrap' }}>
                                      {px.username}
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                    <span style={{ fontSize: 10.5, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, color: dotColor }}>{dotLabel}</span>
                                    <span style={{ fontSize: 10.5, color: 'rgba(244,242,248,.3)', fontFamily: "'JetBrains Mono',monospace" }}>{px.gb_limit}GB</span>
                                    <button
                                      onClick={e => { e.stopPropagation(); checkProxy(px) }}
                                      disabled={check === 'checking'}
                                      style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 9px', borderRadius: 6, border: `1px solid rgba(168,85,247,.3)`, background: 'rgba(168,85,247,.08)', color: AC2, cursor: 'pointer', fontFamily: "'Manrope',sans-serif", opacity: check === 'checking' ? .5 : 1 }}
                                    >
                                      Re-verificar
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  )
}
