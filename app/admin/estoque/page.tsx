'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { TopBar } from '@/components/layout/TopBar'

const AC  = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

interface Product {
  id: string; name: string; proxy_type: string; gb_limit: number
  price: number; cost_price: number | null; description: string | null
  active: boolean; sort_order: number
  total_units: number; available_units: number; sold_units: number; suspended_units: number
}

interface Proxy {
  id: string; host: string; port: number; username: string; password: string
  used_gb: number; gb_limit: number; status: 'available' | 'sold' | 'suspended'
  sold_at: string | null; notes: string | null
  clients?: { email: string; name: string | null } | null
}

const TYPE_LABELS: Record<string, string> = {
  residential_rotating: 'Residencial Rotativo',
  residential_sticky:   'Residencial Fixo',
  mobile:               'Mobile',
  cpa:                  'CPA',
  datacenter:           'Datacenter',
}

const GB_PRESETS = [1, 3, 5, 10, 15, 20, 50]

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function EstoquePage() {
  const { user } = useAuth()

  const [products, setProducts]           = useState<Product[]>([])
  const [loadingProducts, setLoadingProds] = useState(true)
  const [expanded, setExpanded]           = useState<Record<string, Proxy[] | null>>({})
  const [loadingProxies, setLoadingPx]    = useState<Record<string, boolean>>({})
  const [revealed, setRevealed]           = useState<Record<string, boolean>>({})

  // Modal: criar produto
  const [prodModal, setProdModal] = useState(false)
  const [prodForm, setProdForm]   = useState({ name: '', proxy_type: 'residential_rotating', gb_limit: '5', price: '', cost_price: '', description: '' })
  const [prodSaving, setProdSaving] = useState(false)
  const [prodErr, setProdErr]     = useState('')

  // Modal: editar produto
  const [editModal, setEditModal]   = useState<Product | null>(null)
  const [editForm, setEditForm]     = useState({ name: '', price: '', cost_price: '', description: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editErr, setEditErr]       = useState('')

  // Modal: adicionar proxy a produto
  const [pxModal, setPxModal]   = useState<string | null>(null) // product_id
  const [pxForm, setPxForm]     = useState({ host: '', port: '823', username: '', password: '', notes: '' })
  const [pxSaving, setPxSaving] = useState(false)
  const [pxErr, setPxErr]       = useState('')

  async function getToken() { return user?.getIdToken() }

  async function loadProducts() {
    setLoadingProds(true)
    const token = await getToken()
    const res   = await fetch('/api/admin/products', { headers: { Authorization: `Bearer ${token}` } })
    const data  = await res.json()
    setProducts(Array.isArray(data) ? data : [])
    setLoadingProds(false)
  }

  async function loadProxies(productId: string) {
    setLoadingPx(l => ({ ...l, [productId]: true }))
    const token = await getToken()
    const res   = await fetch(`/api/admin/proxies?product_id=${productId}`, { headers: { Authorization: `Bearer ${token}` } })
    const data  = await res.json()
    setExpanded(e => ({ ...e, [productId]: Array.isArray(data) ? data : [] }))
    setLoadingPx(l => ({ ...l, [productId]: false }))
  }

  function toggleExpand(productId: string) {
    if (expanded[productId] !== undefined) {
      setExpanded(e => { const n = { ...e }; delete n[productId]; return n })
    } else {
      loadProxies(productId)
    }
  }

  useEffect(() => { if (user) loadProducts() }, [user])

  async function handleCreateProduct() {
    setProdSaving(true); setProdErr('')
    const token = await getToken()
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...prodForm, gb_limit: Number(prodForm.gb_limit), price: Number(prodForm.price), cost_price: prodForm.cost_price ? Number(prodForm.cost_price) : null }),
    })
    const data = await res.json()
    if (!res.ok) { setProdErr(data.error ?? 'Erro.'); setProdSaving(false); return }
    setProdModal(false)
    setProdForm({ name: '', proxy_type: 'residential_rotating', gb_limit: '5', price: '', cost_price: '', description: '' })
    loadProducts()
    setProdSaving(false)
  }

  function openEdit(product: Product) {
    setEditModal(product)
    setEditForm({
      name:        product.name,
      price:       String(product.price),
      cost_price:  product.cost_price != null ? String(product.cost_price) : '',
      description: product.description ?? '',
    })
    setEditErr('')
  }

  async function handleEditProduct() {
    if (!editModal) return
    setEditSaving(true); setEditErr('')
    const token = await getToken()
    const res = await fetch(`/api/admin/products/${editModal.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({
        name:        editForm.name,
        price:       Number(editForm.price),
        cost_price:  editForm.cost_price ? Number(editForm.cost_price) : null,
        description: editForm.description || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setEditErr(data.error ?? 'Erro ao salvar.'); setEditSaving(false); return }
    setEditModal(null)
    loadProducts()
    setEditSaving(false)
  }

  async function handleToggleActive(product: Product) {
    const token = await getToken()
    await fetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ active: !product.active }),
    })
    loadProducts()
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm('Remover esse produto? As proxies vinculadas serão desvinculadas.')) return
    const token = await getToken()
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) { const d = await res.json(); alert(d.error); return }
    loadProducts()
  }

  async function handleAddProxy() {
    if (!pxModal) return
    setPxSaving(true); setPxErr('')
    const token = await getToken()
    const res = await fetch('/api/admin/proxies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ product_id: pxModal, ...pxForm, port: Number(pxForm.port) }),
    })
    const data = await res.json()
    if (!res.ok) { setPxErr(data.error ?? 'Erro.'); setPxSaving(false); return }
    setPxModal(null)
    setPxForm({ host: '', port: '823', username: '', password: '', notes: '' })
    loadProducts()
    if (expanded[pxModal] !== undefined) loadProxies(pxModal)
    setPxSaving(false)
  }

  async function handlePatchProxyStatus(proxyId: string, status: string, productId: string) {
    const token = await getToken()
    await fetch(`/api/admin/proxies/${proxyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
    loadProxies(productId)
    loadProducts()
  }

  async function handleDeleteProxy(proxyId: string, productId: string) {
    if (!confirm('Remover essa proxy?')) return
    const token = await getToken()
    await fetch(`/api/admin/proxies/${proxyId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    loadProxies(productId)
    loadProducts()
  }

  const inp: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: '#f4f2f8', fontSize: 14, fontFamily: "'Manrope',sans-serif", padding: '10px 14px', outline: 'none', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: 11, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.1em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }

  const totalAvail   = products.reduce((s, p) => s + p.available_units, 0)
  const totalSold    = products.reduce((s, p) => s + p.sold_units, 0)
  const totalRevenue = products.reduce((s, p) => s + p.sold_units * p.price, 0)

  return (
    <DashboardShell isAdmin userName="Admin">
      <TopBar
        title="Estoque"
        sub="Gerencie produtos e proxies por categoria"
        actions={
          <button onClick={() => { setProdModal(true); setProdErr('') }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 14, padding: '11px 20px', borderRadius: 12, border: 'none', cursor: 'pointer' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Novo Produto
          </button>
        }
      />
      <div style={{ padding: 32, fontFamily: "'Manrope',sans-serif", color: '#f4f2f8' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { label: 'Produtos',    value: products.length, color: '#f4f2f8' },
            { label: 'Disponíveis', value: totalAvail,      color: '#34d399' },
            { label: 'Vendidas',    value: totalSold,       color: AC2 },
            { label: 'Receita',     value: fmtBRL(totalRevenue), color: '#34d399' },
          ].map(s => (
            <div key={s.label} style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.12em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase', marginBottom: 10 }}>{s.label}</div>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 26, color: s.color }}>{loadingProducts ? '–' : s.value}</div>
            </div>
          ))}
        </div>

        {/* PRODUTOS */}
        {loadingProducts ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(244,242,248,.3)' }}>Carregando...</div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', border: '1px dashed rgba(255,255,255,.08)', borderRadius: 16, color: 'rgba(244,242,248,.3)', fontSize: 14 }}>
            Nenhum produto ainda. Crie o primeiro acima.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {products.map(prod => {
              const isOpen    = expanded[prod.id] !== undefined
              const proxies   = expanded[prod.id] ?? []
              const loadingPx = loadingProxies[prod.id]
              const stockPct  = prod.total_units > 0 ? Math.round((prod.available_units / prod.total_units) * 100) : 0
              const stockColor = prod.available_units === 0 ? '#f87171' : prod.available_units <= 2 ? '#fbbf24' : '#34d399'

              return (
                <div key={prod.id} style={{ border: `1px solid ${isOpen ? `color-mix(in srgb,${AC} 30%,rgba(255,255,255,.08))` : 'rgba(255,255,255,.08)'}`, background: 'rgba(255,255,255,.02)', borderRadius: 16, overflow: 'hidden', transition: 'border-color .2s' }}>

                  {/* PRODUTO HEADER */}
                  <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      {/* ÍCONE GB */}
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: `color-mix(in srgb,${AC} 15%,transparent)`, border: `1px solid color-mix(in srgb,${AC} 25%,transparent)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 16, color: AC2, lineHeight: 1 }}>{prod.gb_limit}</span>
                        <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono',monospace", color: 'rgba(244,242,248,.5)', letterSpacing: '.05em' }}>GB</span>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 16 }}>{prod.name}</span>
                          {!prod.active && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'rgba(248,113,113,.12)', color: '#f87171', fontFamily: "'JetBrains Mono',monospace" }}>INATIVO</span>}
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: `color-mix(in srgb,${AC} 15%,transparent)`, color: AC2, fontFamily: "'JetBrains Mono',monospace" }}>{TYPE_LABELS[prod.proxy_type] ?? prod.proxy_type}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'rgba(244,242,248,.5)' }}>
                          <span style={{ color: '#34d399', fontWeight: 700, fontSize: 15 }}>{fmtBRL(prod.price)}</span>
                          <span style={{ color: stockColor, fontWeight: 700 }}>{prod.available_units} disponíveis</span>
                          <span>{prod.sold_units} vendidas</span>
                          {prod.cost_price && <span>margem: {fmtBRL(prod.price - prod.cost_price)}</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button onClick={() => { setPxModal(prod.id); setPxErr(''); setPxForm(f => ({ ...f, host: '', username: '', password: '' })) }} style={{ fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 8, border: `1px solid color-mix(in srgb,${AC} 40%,transparent)`, background: `color-mix(in srgb,${AC} 10%,transparent)`, color: AC2, cursor: 'pointer', fontFamily: "'Manrope',sans-serif", whiteSpace: 'nowrap' }}>
                        + Proxy
                      </button>
                      <button onClick={() => openEdit(prod)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.05)', color: 'rgba(244,242,248,.6)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="Editar produto">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                      </button>
                      <button onClick={() => handleToggleActive(prod)} style={{ fontSize: 12, fontWeight: 700, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: 'rgba(244,242,248,.6)', cursor: 'pointer', fontFamily: "'Manrope',sans-serif" }}>
                        {prod.active ? 'Pausar' : 'Ativar'}
                      </button>
                      <button onClick={() => handleDeleteProduct(prod.id)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(248,113,113,.25)', background: 'rgba(248,113,113,.06)', color: '#f87171', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                      <button onClick={() => toggleExpand(prod.id)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.05)', color: 'rgba(244,242,248,.6)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>
                      </button>
                    </div>
                  </div>

                  {/* PROXIES DO PRODUTO */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', background: 'rgba(0,0,0,.15)' }}>
                      {loadingPx ? (
                        <div style={{ padding: '20px 22px', color: 'rgba(244,242,248,.3)', fontSize: 13 }}>Carregando...</div>
                      ) : proxies.length === 0 ? (
                        <div style={{ padding: '20px 22px', color: 'rgba(244,242,248,.3)', fontSize: 13 }}>
                          Nenhuma proxy cadastrada. Clique em &quot;+ Proxy&quot; para adicionar.
                        </div>
                      ) : (
                        <div style={{ padding: '12px 22px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {proxies.map(px => {
                            const pct      = px.gb_limit > 0 ? Math.min(100, Math.round((px.used_gb / px.gb_limit) * 100)) : 0
                            const barColor = pct >= 95 ? '#f87171' : pct >= 75 ? '#fbbf24' : '#34d399'
                            const statusColor = px.status === 'available' ? '#34d399' : px.status === 'sold' ? AC2 : '#f87171'
                            const statusLabel = px.status === 'available' ? 'Disponível' : px.status === 'sold' ? 'Vendida' : 'Suspensa'
                            return (
                              <div key={px.id} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: `0 0 5px ${statusColor}`, display: 'inline-block' }}/>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: 'rgba(244,242,248,.8)' }}>{px.host}:{px.port}</span>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'rgba(244,242,248,.5)' }}>{px.username}</span>
                                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'rgba(244,242,248,.4)' }}>{revealed[px.id] ? px.password : '••••••••'}</span>
                                    <button onClick={() => setRevealed(r => ({ ...r, [px.id]: !r[px.id] }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: AC2, fontSize: 11, fontFamily: "'Manrope',sans-serif", padding: 0 }}>
                                      {revealed[px.id] ? 'ocultar' : 'ver senha'}
                                    </button>
                                    <button onClick={() => navigator.clipboard.writeText(`${px.host}:${px.port}:${px.username}:${px.password}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(244,242,248,.35)', fontSize: 11, fontFamily: "'Manrope',sans-serif", padding: 0 }}>
                                      copiar
                                    </button>
                                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: `color-mix(in srgb,${statusColor} 12%,transparent)`, color: statusColor, fontFamily: "'JetBrains Mono',monospace" }}>{statusLabel}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 340 }}>
                                    <div style={{ flex: 1, height: 4, borderRadius: 3, background: 'rgba(255,255,255,.07)' }}>
                                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: barColor }}/>
                                    </div>
                                    <span style={{ fontSize: 11, color: 'rgba(244,242,248,.4)', whiteSpace: 'nowrap' }}>{px.used_gb.toFixed(2)}/{px.gb_limit}GB</span>
                                  </div>
                                  {px.clients && (
                                    <div style={{ marginTop: 6, fontSize: 11.5, color: 'rgba(244,242,248,.35)' }}>
                                      Cliente: {px.clients.email}{px.sold_at ? ` · ${new Date(px.sold_at).toLocaleDateString('pt-BR')}` : ''}
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  {px.status === 'available' && (
                                    <button onClick={() => handlePatchProxyStatus(px.id, 'suspended', prod.id)} style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(251,191,36,.3)', background: 'rgba(251,191,36,.07)', color: '#fbbf24', cursor: 'pointer', fontFamily: "'Manrope',sans-serif" }}>Pausar</button>
                                  )}
                                  {px.status === 'suspended' && (
                                    <button onClick={() => handlePatchProxyStatus(px.id, 'available', prod.id)} style={{ fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(52,211,153,.3)', background: 'rgba(52,211,153,.07)', color: '#34d399', cursor: 'pointer', fontFamily: "'Manrope',sans-serif" }}>Ativar</button>
                                  )}
                                  {px.status !== 'sold' && (
                                    <button onClick={() => handleDeleteProxy(px.id, prod.id)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(248,113,113,.2)', background: 'rgba(248,113,113,.05)', color: '#f87171', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                                    </button>
                                  )}
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
      </div>

      {/* MODAL: NOVO PRODUTO */}
      {prodModal && (
        <div onClick={() => setProdModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0d0b12', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 480 }}>
            <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 20, margin: '0 0 22px' }}>Novo Produto</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Nome do produto</label>
                <input style={inp} placeholder="Proxy Rotativa 5GB" value={prodForm.name} onChange={e => setProdForm(f => ({ ...f, name: e.target.value }))}/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Tipo</label>
                  <select style={{ ...inp, background: '#13101e', cursor: 'pointer' }} value={prodForm.proxy_type} onChange={e => setProdForm(f => ({ ...f, proxy_type: e.target.value }))}>
                    <option value="residential_rotating">Residencial Rotativo</option>
                    <option value="residential_sticky">Residencial Fixo</option>
                    <option value="mobile">Mobile</option>
                    <option value="cpa">CPA</option>
                    <option value="datacenter">Datacenter</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Cota (GB)</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {GB_PRESETS.map(gb => (
                      <button key={gb} onClick={() => setProdForm(f => ({ ...f, gb_limit: String(gb) }))} style={{ background: prodForm.gb_limit === String(gb) ? AC : 'rgba(255,255,255,.06)', color: prodForm.gb_limit === String(gb) ? '#0a0612' : 'rgba(244,242,248,.7)', fontWeight: 700, fontSize: 12, padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: "'Manrope',sans-serif" }}>{gb}GB</button>
                    ))}
                  </div>
                  <input style={inp} type="number" placeholder="GB" value={prodForm.gb_limit} onChange={e => setProdForm(f => ({ ...f, gb_limit: e.target.value }))}/>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Preço de venda (R$)</label>
                  <input style={inp} type="number" step="0.01" placeholder="27.90" value={prodForm.price} onChange={e => setProdForm(f => ({ ...f, price: e.target.value }))}/>
                </div>
                <div>
                  <label style={lbl}>Custo (R$) — opcional</label>
                  <input style={inp} type="number" step="0.01" placeholder="15.00" value={prodForm.cost_price} onChange={e => setProdForm(f => ({ ...f, cost_price: e.target.value }))}/>
                </div>
              </div>
              <div>
                <label style={lbl}>Descrição (opcional)</label>
                <input style={inp} placeholder="Ideal para CPA, alta anonimidade..." value={prodForm.description} onChange={e => setProdForm(f => ({ ...f, description: e.target.value }))}/>
              </div>
              {prodErr && <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>{prodErr}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setProdModal(false)} style={{ flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(244,242,248,.7)', fontWeight: 700, fontSize: 14, padding: 12, borderRadius: 12, cursor: 'pointer', fontFamily: "'Manrope',sans-serif" }}>Cancelar</button>
                <button onClick={handleCreateProduct} disabled={prodSaving} style={{ flex: 2, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 14, padding: 12, borderRadius: 12, border: 'none', cursor: prodSaving ? 'not-allowed' : 'pointer', opacity: prodSaving ? .7 : 1, fontFamily: "'Manrope',sans-serif" }}>
                  {prodSaving ? 'Criando...' : 'Criar Produto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR PROXY AO PRODUTO */}
      {pxModal && (
        <div onClick={() => setPxModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0d0b12', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 440 }}>
            <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 20, margin: '0 0 6px' }}>Adicionar Proxy</h2>
            <p style={{ margin: '0 0 22px', fontSize: 13, color: 'rgba(244,242,248,.45)' }}>
              {products.find(p => p.id === pxModal)?.name}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12 }}>
                <div>
                  <label style={lbl}>Host</label>
                  <input style={inp} placeholder="auto-rh7proxys.com" value={pxForm.host} onChange={e => setPxForm(f => ({ ...f, host: e.target.value }))}/>
                </div>
                <div>
                  <label style={lbl}>Porta</label>
                  <input style={inp} type="number" placeholder="823" value={pxForm.port} onChange={e => setPxForm(f => ({ ...f, port: e.target.value }))}/>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Usuário</label>
                  <input style={inp} placeholder="066c3250af29..." value={pxForm.username} onChange={e => setPxForm(f => ({ ...f, username: e.target.value }))}/>
                </div>
                <div>
                  <label style={lbl}>Senha</label>
                  <input style={inp} placeholder="9e1d013ca3..." value={pxForm.password} onChange={e => setPxForm(f => ({ ...f, password: e.target.value }))}/>
                </div>
              </div>
              <div>
                <label style={lbl}>Notas (opcional)</label>
                <input style={inp} placeholder="Lote set/2026..." value={pxForm.notes} onChange={e => setPxForm(f => ({ ...f, notes: e.target.value }))}/>
              </div>
              {pxErr && <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>{pxErr}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setPxModal(null)} style={{ flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(244,242,248,.7)', fontWeight: 700, fontSize: 14, padding: 12, borderRadius: 12, cursor: 'pointer', fontFamily: "'Manrope',sans-serif" }}>Cancelar</button>
                <button onClick={handleAddProxy} disabled={pxSaving} style={{ flex: 2, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 14, padding: 12, borderRadius: 12, border: 'none', cursor: pxSaving ? 'not-allowed' : 'pointer', opacity: pxSaving ? .7 : 1, fontFamily: "'Manrope',sans-serif" }}>
                  {pxSaving ? 'Adicionando...' : 'Adicionar ao Estoque'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: EDITAR PRODUTO */}
      {editModal && (
        <div onClick={() => setEditModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0d0b12', border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 440 }}>
            <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 20, margin: '0 0 4px' }}>Editar Produto</h2>
            <p style={{ margin: '0 0 22px', fontSize: 12, fontFamily: "'JetBrains Mono',monospace", color: 'rgba(244,242,248,.35)' }}>
              {editModal.gb_limit}GB · {TYPE_LABELS[editModal.proxy_type] ?? editModal.proxy_type}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lbl}>Nome do produto</label>
                <input style={inp} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Preço de venda (R$)</label>
                  <input style={inp} type="number" step="0.01" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}/>
                </div>
                <div>
                  <label style={lbl}>Custo (R$) — opcional</label>
                  <input style={inp} type="number" step="0.01" value={editForm.cost_price} onChange={e => setEditForm(f => ({ ...f, cost_price: e.target.value }))}/>
                </div>
              </div>
              {editForm.price && editForm.cost_price && (
                <div style={{ background: `color-mix(in srgb,${AC} 10%,transparent)`, border: `1px solid color-mix(in srgb,${AC} 22%,transparent)`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: AC2 }}>
                  Margem: {fmtBRL(Number(editForm.price) - Number(editForm.cost_price))} por unidade
                </div>
              )}
              <div>
                <label style={lbl}>Descrição (opcional)</label>
                <input style={inp} placeholder="Ideal para CPA, alta anonimidade..." value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}/>
              </div>
              {editErr && <div style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 10, padding: '10px 14px', color: '#f87171', fontSize: 13 }}>{editErr}</div>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditModal(null)} style={{ flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(244,242,248,.7)', fontWeight: 700, fontSize: 14, padding: 12, borderRadius: 12, cursor: 'pointer', fontFamily: "'Manrope',sans-serif" }}>Cancelar</button>
                <button onClick={handleEditProduct} disabled={editSaving} style={{ flex: 2, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 14, padding: 12, borderRadius: 12, border: 'none', cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? .7 : 1, fontFamily: "'Manrope',sans-serif" }}>
                  {editSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardShell>
  )
}
