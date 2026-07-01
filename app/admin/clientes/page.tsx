'use client'

import { useState, useEffect } from 'react'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Search, ChevronDown, Copy, RefreshCw } from 'lucide-react'

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
  sold_at: string | null
  price: number | null
}

interface AvailableProxy {
  id: string
  label: string
  host: string
  port: number
  gb_limit: number
  username: string
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function usagePct(used: number, limit: number) {
  if (!limit) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

const AC  = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

export default function ClientesPage() {
  const [clients, setClients]   = useState<Client[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  const [expanded, setExpanded]   = useState<Record<string, Proxy[] | null>>({})
  const [loadingPx, setLoadingPx] = useState<Record<string, boolean>>({})
  const [checkMap, setCheckMap]   = useState<Record<string, 'checking' | 'ok' | 'fail'>>({})
  const [actionMap, setActionMap] = useState<Record<string, boolean>>({})
  const [copied, setCopied]       = useState<string | null>(null)

  // assign modal
  const [assignModal, setAssignModal]   = useState<Client | null>(null)
  const [availProxies, setAvailProxies] = useState<AvailableProxy[]>([])
  const [loadingAvail, setLoadingAvail] = useState(false)
  const [assigning, setAssigning]       = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/clients')
      .then(r => r.json())
      .then(d => setClients(Array.isArray(d) ? d : []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false))
  }, [])

  async function loadClientProxies(clientId: string) {
    setLoadingPx(l => ({ ...l, [clientId]: true }))
    const res  = await fetch(`/api/admin/proxies?assigned_to=${clientId}`)
    const data = res.ok ? await res.json() : []
    const proxies: Proxy[] = Array.isArray(data) ? data : []
    setExpanded(e => ({ ...e, [clientId]: proxies }))
    setLoadingPx(l => ({ ...l, [clientId]: false }))
    proxies.forEach(px => checkProxy(px))
  }

  async function toggleClient(client: Client) {
    if (expanded[client.id] !== undefined) {
      setExpanded(e => { const n = { ...e }; delete n[client.id]; return n })
      return
    }
    setExpanded(e => ({ ...e, [client.id]: null }))
    loadClientProxies(client.id)
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

  async function updateProxyStatus(clientId: string, proxyId: string, newStatus: 'sold' | 'suspended') {
    setActionMap(a => ({ ...a, [proxyId]: true }))
    try {
      const res = await fetch(`/api/admin/proxies/${proxyId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setExpanded(e => ({
          ...e,
          [clientId]: (e[clientId] ?? []).map(p =>
            p.id === proxyId ? { ...p, status: newStatus } : p
          ),
        }))
      }
    } finally {
      setActionMap(a => ({ ...a, [proxyId]: false }))
    }
  }

  async function removeProxy(clientId: string, proxyId: string) {
    if (!confirm('Remover proxy deste cliente? Ela voltará para o estoque como disponível.')) return
    setActionMap(a => ({ ...a, [proxyId]: true }))
    try {
      await fetch(`/api/admin/proxies/${proxyId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ assigned_to: null, status: 'available', sold_at: null }),
      })
      setExpanded(e => ({
        ...e,
        [clientId]: (e[clientId] ?? []).filter(p => p.id !== proxyId),
      }))
    } finally {
      setActionMap(a => ({ ...a, [proxyId]: false }))
    }
  }

  async function openAssignModal(client: Client, e: React.MouseEvent) {
    e.stopPropagation()
    setAssignModal(client)
    setLoadingAvail(true)
    setAvailProxies([])
    const res = await fetch('/api/admin/proxies?status=available')
    const data = res.ok ? await res.json() : []
    setAvailProxies(Array.isArray(data) ? data : [])
    setLoadingAvail(false)
  }

  async function assignProxy(proxyId: string) {
    if (!assignModal) return
    setAssigning(proxyId)
    try {
      await fetch(`/api/admin/proxies/${proxyId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          assigned_to: assignModal.id,
          status:      'sold',
          sold_at:     new Date().toISOString(),
        }),
      })
      setAssignModal(null)
      if (expanded[assignModal.id] !== undefined) {
        loadClientProxies(assignModal.id)
      }
    } finally {
      setAssigning(null)
    }
  }

  function copyCredentials(px: Proxy) {
    const text = `${px.host}:${px.port}:${px.username}:${px.password}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(px.id)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  })

  const inp: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: '#f4f2f8', fontSize: 14, fontFamily: "'Manrope',sans-serif", padding: '10px 14px', outline: 'none', boxSizing: 'border-box' }

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
              {/* TABLE HEADER */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 120px 90px 110px 32px', gap: 8, padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                {['Cliente', 'Pedidos', 'Total gasto', 'Cadastro', '', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', color: 'rgba(244,242,248,.3)', textAlign: i === 1 ? 'center' : 'left' }}>{h}</div>
                ))}
              </div>

              {filtered.map((c, idx) => {
                const isOpen      = expanded[c.id] !== undefined
                const proxies     = expanded[c.id] ?? []
                const isPxLoading = loadingPx[c.id]

                return (
                  <div key={c.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,.06)' : 'none' }}>

                    {/* CLIENTE ROW */}
                    <div
                      onClick={() => toggleClient(c)}
                      style={{ display: 'grid', gridTemplateColumns: '1fr 70px 120px 90px 110px 32px', gap: 8, alignItems: 'center', padding: '13px 20px', cursor: 'pointer', transition: 'background .15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${AC2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#0a0612', flexShrink: 0 }}>
                          {(c.name || c.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#f4f2f8' }}>{c.name || '—'}</div>
                          <div style={{ fontSize: 11, color: 'rgba(244,242,248,.4)' }}>{c.email}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: 'rgba(244,242,248,.55)', textAlign: 'center' }}>{c.orders}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f4f2f8' }}>{fmtBRL(c.spent)}</div>
                      <div style={{ fontSize: 11, color: 'rgba(244,242,248,.4)' }}>{fmtDate(c.joined)}</div>
                      <div onClick={e => openAssignModal(c, e)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 7, border: `1px solid color-mix(in srgb,${AC} 40%,transparent)`, background: `color-mix(in srgb,${AC} 10%,transparent)`, color: AC2, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Manrope',sans-serif" }}>
                        + Proxy
                      </div>
                      <div style={{ color: 'rgba(244,242,248,.3)', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none', display: 'flex', justifyContent: 'center' }}>
                        <ChevronDown size={14} />
                      </div>
                    </div>

                    {/* PROXIES EXPANDIDAS */}
                    {isOpen && (
                      <div style={{ padding: '4px 20px 16px 62px', background: 'rgba(0,0,0,.15)' }}>
                        {isPxLoading ? (
                          <div style={{ fontSize: 12, color: 'rgba(244,242,248,.3)', padding: '12px 0' }}>Carregando proxies...</div>
                        ) : proxies.length === 0 ? (
                          <div style={{ fontSize: 12, color: 'rgba(244,242,248,.3)', padding: '12px 0' }}>Nenhuma proxy atribuída. Clique em &quot;+ Proxy&quot; para atribuir.</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
                            {proxies.map(px => {
                              const check    = checkMap[px.id]
                              const isSusp   = px.status === 'suspended'
                              const pct      = usagePct(Number(px.used_gb), Number(px.gb_limit))
                              const barColor = pct >= 90 ? '#f87171' : pct >= 70 ? '#fbbf24' : '#34d399'
                              const dotColor = isSusp ? '#6b7280' : check === 'ok' ? '#34d399' : check === 'fail' ? '#f87171' : '#fbbf24'
                              const busy     = actionMap[px.id]

                              return (
                                <div key={px.id} style={{ background: 'rgba(255,255,255,.03)', border: `1px solid ${isSusp ? 'rgba(107,114,128,.2)' : 'rgba(255,255,255,.07)'}`, borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

                                  {/* TOP ROW */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, boxShadow: `0 0 5px ${dotColor}`, flexShrink: 0, display: 'inline-block' }} />
                                      <span style={{ fontSize: 13, fontWeight: 700, color: '#f4f2f8' }}>{px.label || 'Proxy Residencial'}</span>
                                      <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 5, background: isSusp ? 'rgba(107,114,128,.15)' : 'rgba(168,85,247,.12)', color: isSusp ? '#9ca3af' : AC2, fontWeight: 700, letterSpacing: '.04em' }}>
                                        {isSusp ? 'SUSPENSA' : 'ATIVA'}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'rgba(244,242,248,.4)' }}>
                                      {px.sold_at && <span>Comprado em {fmtDate(px.sold_at)}</span>}
                                      {px.price != null && <span style={{ color: 'rgba(244,242,248,.7)', fontWeight: 600 }}>{fmtBRL(px.price)}</span>}
                                    </div>
                                  </div>

                                  {/* CREDENTIALS */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,.2)', borderRadius: 8, padding: '7px 10px' }}>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: 'rgba(244,242,248,.65)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {px.host}:{px.port} · <span style={{ color: '#c084fc' }}>{px.username}</span> · {px.password}
                                    </span>
                                    <button
                                      onClick={() => copyCredentials(px)}
                                      title="Copiar credenciais"
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === px.id ? '#34d399' : 'rgba(244,242,248,.35)', padding: 2, flexShrink: 0 }}
                                    >
                                      <Copy size={13} />
                                    </button>
                                  </div>

                                  {/* USAGE BAR */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'rgba(244,242,248,.4)' }}>
                                      <span>Uso de dados</span>
                                      <span style={{ fontWeight: 600, color: barColor }}>{Number(px.used_gb).toFixed(2)} / {px.gb_limit} GB · {pct}%</span>
                                    </div>
                                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
                                      <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width .4s' }} />
                                    </div>
                                  </div>

                                  {/* ACTIONS */}
                                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                    <button
                                      onClick={e => { e.stopPropagation(); checkProxy(px) }}
                                      disabled={check === 'checking'}
                                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: 'rgba(244,242,248,.6)', cursor: 'pointer', opacity: check === 'checking' ? .5 : 1 }}
                                    >
                                      <RefreshCw size={11} style={{ animation: check === 'checking' ? 'spin 1s linear infinite' : 'none' }} />
                                      Verificar
                                    </button>

                                    {isSusp ? (
                                      <button
                                        onClick={e => { e.stopPropagation(); updateProxyStatus(c.id, px.id, 'sold') }}
                                        disabled={busy}
                                        style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(52,211,153,.3)', background: 'rgba(52,211,153,.08)', color: '#34d399', cursor: 'pointer', opacity: busy ? .5 : 1 }}
                                      >
                                        Reativar
                                      </button>
                                    ) : (
                                      <button
                                        onClick={e => { e.stopPropagation(); updateProxyStatus(c.id, px.id, 'suspended') }}
                                        disabled={busy}
                                        style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(251,191,36,.3)', background: 'rgba(251,191,36,.08)', color: '#fbbf24', cursor: 'pointer', opacity: busy ? .5 : 1 }}
                                      >
                                        Suspender
                                      </button>
                                    )}

                                    <button
                                      onClick={e => { e.stopPropagation(); removeProxy(c.id, px.id) }}
                                      disabled={busy}
                                      style={{ fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(248,113,113,.3)', background: 'rgba(248,113,113,.08)', color: '#f87171', cursor: 'pointer', opacity: busy ? .5 : 1 }}
                                    >
                                      Remover
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

      {/* MODAL: ATRIBUIR PROXY */}
      {assignModal && (
        <div onClick={() => setAssignModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0d0b12', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 6 }}>
              <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 20, margin: 0 }}>Atribuir Proxy</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(244,242,248,.4)' }}>
                {assignModal.name || assignModal.email}
              </p>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, marginTop: 20 }}>
              {loadingAvail ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(244,242,248,.3)', fontSize: 13 }}>Carregando proxies disponíveis...</div>
              ) : availProxies.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', border: '1px dashed rgba(255,255,255,.08)', borderRadius: 12, color: 'rgba(244,242,248,.3)', fontSize: 13 }}>
                  Nenhuma proxy disponível no estoque.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {availProxies.map(px => (
                    <div key={px.id} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f4f2f8', marginBottom: 3 }}>{px.label}</div>
                        <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: 'rgba(244,242,248,.4)' }}>
                          {px.host}:{px.port} · {px.gb_limit} GB
                        </div>
                      </div>
                      <button
                        onClick={() => assignProxy(px.id)}
                        disabled={assigning === px.id}
                        style={{ fontSize: 12, fontWeight: 700, padding: '7px 16px', borderRadius: 8, border: 'none', background: AC, color: '#0a0612', cursor: assigning === px.id ? 'not-allowed' : 'pointer', opacity: assigning === px.id ? .6 : 1, whiteSpace: 'nowrap', fontFamily: "'Manrope',sans-serif", flexShrink: 0 }}
                      >
                        {assigning === px.id ? 'Atribuindo...' : 'Atribuir'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setAssignModal(null)}
              style={{ marginTop: 20, width: '100%', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(244,242,248,.7)', fontWeight: 700, fontSize: 14, padding: 12, borderRadius: 12, cursor: 'pointer', fontFamily: "'Manrope',sans-serif" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
