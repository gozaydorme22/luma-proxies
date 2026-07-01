'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'

const AC  = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

function AnimBar({ pct, color }: { pct: number; color: string }) {
  const [w, setW] = useState(0)
  useEffect(() => { const id = requestAnimationFrame(() => setW(pct)); return () => cancelAnimationFrame(id) }, [pct])
  return <div style={{ height: '100%', width: `${w}%`, borderRadius: 6, background: `linear-gradient(90deg,${AC},${color})`, transition: 'width .9s cubic-bezier(.4,0,.2,1)' }} />
}

interface Proxy {
  id: string; name: string; proxyUser: string | null; proxyPass: string | null
  type: string; status: 'ativa' | 'inativa' | 'suspensa'; host: string | null; port: number | null
  threads: number | null; totalGb: number; usedGb: number
}

function fmtGb(gb: number) {
  if (gb >= 1) return gb.toFixed(gb % 1 === 0 ? 0 : 2).replace('.', ',') + ' GB'
  const mb = gb * 1024
  if (mb >= 0.1) return mb.toFixed(mb >= 10 ? 0 : 1) + ' MB'
  return (mb * 1024).toFixed(0) + ' KB'
}

function buildChart(data: number[], W: number, H: number, pad: number) {
  if (data.every(v => v === 0)) return { line: '', area: '' }
  const max = Math.max(...data)
  const n   = data.length
  const pts = data.map((v, i) => ({
    x: (i / (n - 1)) * W,
    y: H - pad - (v / max) * (H - pad * 2),
  }))
  let line = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(n - 1, i + 2)]
    const cp1x = (p1.x + (p2.x - p0.x) / 6).toFixed(1)
    const cp1y = (p1.y + (p2.y - p0.y) / 6).toFixed(1)
    const cp2x = (p2.x - (p3.x - p1.x) / 6).toFixed(1)
    const cp2y = (p2.y - (p3.y - p1.y) / 6).toFixed(1)
    line += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return { line, area: line + ` L ${W} ${H} L 0 ${H} Z` }
}

const typeMap: Record<string, [string, string, string]> = {
  residencial:      [`color-mix(in srgb,${AC} 22%,transparent)`, '#fff', 'RESIDENCIAL'],
  residencial_fixo: [`color-mix(in srgb,${AC} 22%,transparent)`, '#fff', 'RESIDENCIAL'],
  mobile:           ['rgba(52,211,153,.16)', '#34d399', 'MOBILE'],
  cpa:              ['rgba(255,255,255,.07)', 'rgba(244,242,248,.7)', 'CPA'],
  ipv4:             ['rgba(255,255,255,.07)', 'rgba(244,242,248,.7)', 'IPV4'],
  datacenter:       ['rgba(255,255,255,.07)', 'rgba(244,242,248,.7)', 'DC'],
}

const chipBase: React.CSSProperties = {
  border: 'none', cursor: 'pointer', fontFamily: "'Manrope',sans-serif",
  fontSize: 13, fontWeight: 700, padding: '7px 14px', borderRadius: 8,
}
const chipOn:  React.CSSProperties = { ...chipBase, background: AC, color: '#0a0612' }
const chipOff: React.CSSProperties = { ...chipBase, background: 'transparent', color: 'rgba(244,242,248,.55)' }
const iconBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
  borderRadius: 6, width: 24, height: 24, display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: AC2, flexShrink: 0,
}

type Range = '24h' | '7d' | '14d'

export default function ProxiesPage() {
  const { user } = useAuth()
  const [proxies, setProxies]       = useState<Proxy[]>([])
  const [usage14d, setUsage14d]     = useState<number[]>(new Array(14).fill(0))
  const [usage7d,  setUsage7d]      = useState<number[]>(new Array(7).fill(0))
  const [usage24h, setUsage24h]     = useState<number[]>(new Array(24).fill(0))
  const [range,    setRange]        = useState<Range>('14d')
  const [totalRemGb, setTotalRemGb] = useState(0)
  const [tier, setTier]             = useState('Bronze')
  const [loading, setLoading]       = useState(true)
  const [syncing,   setSyncing]     = useState(false)
  const [removing,  setRemoving]   = useState<string | null>(null)
  const [revealed, setRevealed]     = useState<Record<string, boolean>>({})
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState<'all' | 'ativa' | 'inativa'>('all')
  const [hoverIdx, setHoverIdx]     = useState<number | null>(null)

  async function loadProxies() {
    const d = await fetch('/api/proxies').then(r => r.json()).catch(() => ({}))
    setProxies(d.proxies ?? [])
    setUsage14d(d.usage14d ?? new Array(14).fill(0))
    setUsage7d(d.usage7d   ?? new Array(7).fill(0))
    setUsage24h(d.usage24h ?? new Array(24).fill(0))
    setTotalRemGb(d.totalRemainingGb ?? 0)
    setTier(capitalize(d.client?.tier ?? 'bronze'))
  }

  async function removeProxy(id: string) {
    if (!confirm('Remover esta proxy do seu painel? Esta ação não pode ser desfeita.')) return
    setRemoving(id)
    try {
      const res = await fetch(`/api/proxies/${id}`, { method: 'DELETE' })
      if (res.ok) setProxies(prev => prev.filter(p => p.id !== id))
    } catch { /* ignore */ } finally {
      setRemoving(null)
    }
  }

  async function syncUsage() {
    setSyncing(true)
    try {
      await fetch('/api/proxies/refresh', {
        method: 'POST',
        signal: AbortSignal.timeout(12000),
      })
      await loadProxies()
    } catch { /* ignore */ } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    loadProxies()
      .catch(() => null)
      .finally(() => setLoading(false))
    // Sync usage from SmartProxy in the background on page load
    fetch('/api/proxies/refresh', { method: 'POST', signal: AbortSignal.timeout(12000) })
      .then(() => loadProxies())
      .catch(() => null)
  }, [])

  const firstName = user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'usuário'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const visible = proxies
    .filter(p => filter === 'all' || p.status === filter)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.proxyUser ?? '').toLowerCase().includes(search.toLowerCase()))

  const activeData = range === '24h' ? usage24h : range === '7d' ? usage7d : usage14d
  const chart      = buildChart(activeData, 720, 200, 18)
  const sumGb      = activeData.reduce((a, b) => a + b, 0)
  const ativas     = proxies.filter(p => p.status === 'ativa').length

  const rangeLabel: Record<Range, string> = {
    '24h': 'últimas 24 horas',
    '7d':  'últimos 7 dias',
    '14d': 'últimos 14 dias',
  }
  const xLabels: Record<Range, string[]> = {
    '24h': ['24h atrás', '18h', '12h', '6h', 'agora'],
    '7d':  ['7d atrás', '5d', '3d', '1d', 'hoje'],
    '14d': ['14d atrás', '10d', '6d', '2d', 'hoje'],
  }

  return (
    <div style={{ animation: 'lumaRise .4s ease both' }}>
      <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 22, letterSpacing: '-.01em', margin: 0 }}>
        {greeting}, <span style={{ color: AC }}>{firstName}</span>
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(244,242,248,.45)', margin: '5px 0 0' }}>Bem-vindo de volta. Aqui está o resumo das suas proxies.</p>

      {/* STAT CARDS */}
      <div className="dash-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginTop: 26 }}>
        <StatCard loading={loading} label="Proxys"     value={String(proxies.length)} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2"><rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/></svg>} />
        <StatCard loading={loading} label="Ativas"      value={String(ativas)} valueColor="#34d399" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><path d="M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M12 20h.01"/></svg>} />
        <StatCard loading={loading} label="Inativas"    value={String(proxies.length - ativas)} valueColor="#f87171" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>} />
        <StatCard loading={loading} label="Saldo total" value={fmtGb(totalRemGb)} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/></svg>} />
      </div>

      {/* CHART */}
      <div className="dash-section" style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: '22px 24px', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.14em', color: 'rgba(244,242,248,.45)', textTransform: 'uppercase' }}>Consumo de dados · {rangeLabel[range]}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
              <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 500, fontSize: 20 }}>{fmtGb(sumGb)}</span>
              <span style={{ fontSize: 12, color: '#34d399', fontWeight: 500 }}>▲ consumidos no período</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: 4 }}>
            {(['24h', '7d', '14d'] as Range[]).map(r => (
              <button key={r} onClick={() => setRange(r)} style={{ fontSize: 12, fontWeight: r === range ? 700 : 600, color: r === range ? '#0a0612' : 'rgba(244,242,248,.5)', background: r === range ? AC : 'transparent', padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: "'Manrope',sans-serif" }}>{r}</button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 18, position: 'relative' }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <svg viewBox="0 0 720 200" preserveAspectRatio="none" style={{ width: '100%', height: 190, display: 'block', cursor: 'crosshair' }}
            onMouseMove={e => {
              const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
              const pct  = (e.clientX - rect.left) / rect.width
              const idx  = Math.round(pct * (activeData.length - 1))
              setHoverIdx(Math.max(0, Math.min(activeData.length - 1, idx)))
            }}
          >
            <defs>
              <linearGradient id="lumaArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`color-mix(in srgb,${AC} 55%,transparent)`}/>
                <stop offset="100%" stopColor={`color-mix(in srgb,${AC} 0%,transparent)`}/>
              </linearGradient>
            </defs>
            <line x1="0" y1="50"  x2="720" y2="50"  stroke="rgba(255,255,255,.05)" strokeWidth="1"/>
            <line x1="0" y1="100" x2="720" y2="100" stroke="rgba(255,255,255,.05)" strokeWidth="1"/>
            <line x1="0" y1="150" x2="720" y2="150" stroke="rgba(255,255,255,.05)" strokeWidth="1"/>
            {chart.area && <path d={chart.area} fill="url(#lumaArea)"/>}
            {chart.line && <path d={chart.line} fill="none" stroke={AC2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1400" style={{ animation: 'lumaDraw 1.4s ease both' }}/>}
            {hoverIdx !== null && (() => {
              const n    = activeData.length
              const svgX = (hoverIdx / (n - 1)) * 720
              return <line x1={svgX} y1="0" x2={svgX} y2="200" stroke="rgba(255,255,255,.18)" strokeWidth="1" strokeDasharray="4 3"/>
            })()}
          </svg>

          {hoverIdx !== null && (() => {
            const n    = activeData.length
            const max  = Math.max(...activeData)
            const svgY = max > 0 ? 200 - 18 - (activeData[hoverIdx] / max) * (200 - 36) : 182
            const dotTop  = (svgY / 200) * 190
            const dotLeft = (hoverIdx / (n - 1)) * 100
            return (
              <div style={{
                position: 'absolute', pointerEvents: 'none',
                top: dotTop, left: `${dotLeft}%`,
                transform: 'translate(-50%, -50%)',
                width: 10, height: 10, borderRadius: '50%',
                background: AC, border: '2.5px solid #0a0612',
                boxShadow: `0 0 8px color-mix(in srgb,${AC} 70%,transparent)`,
              }}/>
            )
          })()}

          {hoverIdx !== null && (() => {
            const n       = activeData.length
            const daysAgo = n - 1 - hoverIdx
            const label   = range === '24h'
              ? (daysAgo === 0 ? 'agora' : `${daysAgo}h atrás`)
              : (daysAgo === 0 ? 'hoje'  : `${daysAgo}d atrás`)
            const leftPct = (hoverIdx / (n - 1)) * 100
            return (
              <div style={{
                position: 'absolute', top: 8,
                left: `${leftPct}%`,
                transform: leftPct > 75 ? 'translateX(-100%)' : leftPct < 10 ? 'translateX(0)' : 'translateX(-50%)',
                background: 'rgba(13,11,18,.94)',
                border: `1px solid color-mix(in srgb,${AC} 30%,transparent)`,
                borderRadius: 9, padding: '7px 12px', pointerEvents: 'none', whiteSpace: 'nowrap',
                boxShadow: `0 4px 20px color-mix(in srgb,${AC} 18%,transparent)`,
              }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: '#f4f2f8' }}>
                  {fmtGb(activeData[hoverIdx])}
                </div>
                <div style={{ fontSize: 10.5, color: 'rgba(244,242,248,.4)', marginTop: 2, fontFamily: "'Manrope',sans-serif" }}>
                  {label}
                </div>
              </div>
            )
          })()}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: 'rgba(244,242,248,.35)' }}>
            {xLabels[range].map(l => <span key={l}>{l}</span>)}
          </div>
        </div>
      </div>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginTop: 30 }}>
        <div>
          <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 16, margin: 0 }}>Minhas Proxys</h2>
          <p style={{ fontSize: 13, color: 'rgba(244,242,248,.45)', margin: '4px 0 0' }}>Gerencie suas proxies residenciais</p>
        </div>
        <Link href="?checkout=1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 13.5, padding: '11px 18px', borderRadius: 11, textDecoration: 'none', boxShadow: `0 8px 24px color-mix(in srgb,${AC} 40%,transparent)` }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>Adicionar Proxy
        </Link>
      </div>

      {/* SEARCH + FILTER */}
      <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', borderRadius: 12, padding: '0 14px' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(244,242,248,.4)" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, login ou ID..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#f4f2f8', fontSize: 14, fontFamily: "'Manrope',sans-serif", padding: '13px 0' }}/>
        </div>
        <div style={{ display: 'flex', gap: 6, border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 5 }}>
          <button onClick={() => setFilter('all')}     style={filter === 'all'     ? chipOn : chipOff}>Todas</button>
          <button onClick={() => setFilter('ativa')}   style={filter === 'ativa'   ? chipOn : chipOff}>Ativas</button>
          <button onClick={() => setFilter('inativa')} style={filter === 'inativa' ? chipOn : chipOff}>Inativas</button>
        </div>
      </div>

      {/* PROXY CARDS */}
      {loading ? (
        <div className="dash-proxy-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginTop: 18 }}>
          {[0, 1].map(i => (
            <div key={i} style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="skeleton" style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0 }} />
                <div className="skeleton" style={{ height: 16, width: '55%', borderRadius: 6 }} />
                <div className="skeleton" style={{ height: 20, width: 72, borderRadius: 6, marginLeft: 'auto' }} />
              </div>
              <div className="skeleton" style={{ height: 8, borderRadius: 6 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[0, 1, 2].map(j => <div key={j} className="skeleton" style={{ height: 14, borderRadius: 6, width: j === 1 ? '70%' : '85%' }} />)}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <div className="skeleton" style={{ flex: 1, height: 38, borderRadius: 10 }} />
                <div className="skeleton" style={{ flex: 1, height: 38, borderRadius: 10 }} />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', border: '1px dashed rgba(255,255,255,.08)', borderRadius: 16, marginTop: 18 }}>
          <div style={{ fontSize: 14, color: 'rgba(244,242,248,.35)' }}>
            {proxies.length === 0 ? 'Você ainda não tem proxies. Adquira uma no catálogo.' : 'Nenhuma proxy encontrada com esse filtro.'}
          </div>
          {proxies.length === 0 && (
            <Link href="?checkout=1" style={{ display: 'inline-flex', marginTop: 18, alignItems: 'center', gap: 8, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 13, padding: '11px 20px', borderRadius: 10, textDecoration: 'none' }}>
              Adquirir primeira proxy
            </Link>
          )}
        </div>
      ) : (
        <div className="dash-proxy-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginTop: 18 }}>
          {visible.map(p => {
            const pct = p.totalGb > 0 ? Math.min(100, Math.round((p.usedGb / p.totalGb) * 100)) : 0
            const remaining = Math.max(0, p.totalGb - p.usedGb)
            const barColor  = pct >= 95 ? '#f87171' : pct >= 75 ? '#fbbf24' : AC2
            const [tagBg, tagFg, tagLabel] = typeMap[p.type] ?? typeMap['ipv4']
            const dot = p.status === 'ativa' ? '#34d399' : 'rgba(244,242,248,.4)'
            return (
              <div key={p.id} className="proxy-card" style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: dot, boxShadow: `0 0 8px ${dot}`, display: 'inline-block' }}/>
                    <h3 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 15, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h3>
                  </div>
                  <span style={{ flexShrink: 0, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.1em', padding: '4px 8px', borderRadius: 6, background: tagBg, color: tagFg }}>{tagLabel}</span>
                </div>

                {p.totalGb > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 7 }}>
                      <span style={{ color: 'rgba(244,242,248,.5)' }}>Consumo</span>
                      <span style={{ fontWeight: 700 }}>
                        <span style={{ color: barColor }}>{fmtGb(p.usedGb)}</span>{' '}
                        <span style={{ color: 'rgba(244,242,248,.4)' }}>/ {fmtGb(p.totalGb)}</span>
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 6, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
                      <AnimBar pct={pct} color={barColor} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'rgba(244,242,248,.4)' }}>
                      <span>{pct}% usado</span><span>{fmtGb(remaining)} restante</span>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13 }}>
                  {p.proxyUser && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ color: 'rgba(244,242,248,.5)' }}>Usuário</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: 'rgba(244,242,248,.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>{p.proxyUser}</span>
                        <button onClick={() => navigator.clipboard.writeText(p.proxyUser!)} style={iconBtn}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                        </button>
                      </span>
                    </div>
                  )}
                  {p.proxyPass && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ color: 'rgba(244,242,248,.5)' }}>Senha</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: 'rgba(244,242,248,.8)' }}>{revealed[p.id] ? p.proxyPass : '••••••••'}</span>
                        <button onClick={() => setRevealed(prev => ({ ...prev, [p.id]: !prev[p.id] }))} style={iconBtn}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                      </span>
                    </div>
                  )}
                  {p.host && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(244,242,248,.5)' }}>Host</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: 'rgba(244,242,248,.8)' }}>{p.host}{p.port ? `:${p.port}` : ''}</span>
                    </div>
                  )}
                  {p.threads && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(244,242,248,.5)' }}>Threads</span><span style={{ fontWeight: 600 }}>{p.threads.toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button
                    onClick={syncUsage}
                    disabled={syncing}
                    title="Atualizar consumo"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', color: '#f4f2f8', borderRadius: 10, padding: '11px 14px', cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? .5 : 1 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: syncing ? 'lumaSpin 1s linear infinite' : 'none' }}><path d="M21 12a9 9 0 1 1-2.6-6.3M21 4v5h-5"/></svg>
                  </button>
                  {p.status === 'suspensa' ? (
                    <button
                      onClick={() => removeProxy(p.id)}
                      disabled={removing === p.id}
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.25)', color: '#f87171', fontWeight: 700, fontSize: 13, padding: 11, borderRadius: 10, cursor: removing === p.id ? 'not-allowed' : 'pointer', opacity: removing === p.id ? .5 : 1 }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      Remover
                    </button>
                  ) : (
                    <Link href="?checkout=1" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', color: '#f4f2f8', fontWeight: 700, fontSize: 13, padding: 11, borderRadius: 10, textDecoration: 'none' }}>
                      Recarregar
                    </Link>
                  )}
                  <Link href={`/dashboard/proxies/${p.id}`} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: p.status === 'suspensa' ? 'rgba(255,255,255,.05)' : AC, color: p.status === 'suspensa' ? '#f4f2f8' : '#0a0612', fontWeight: 800, fontSize: 13, padding: 11, borderRadius: 10, textDecoration: 'none' }}>
                    Gerenciar <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

function StatCard({ label, icon, value, valueColor, highlight, loading }: { label: string; icon: React.ReactNode; value: string; valueColor?: string; highlight?: boolean; loading?: boolean }) {
  return (
    <div className="dash-stat-card" style={{
      border: highlight ? `1px solid color-mix(in srgb,${AC} 24%,transparent)` : '1px solid rgba(255,255,255,.08)',
      background: highlight ? `linear-gradient(180deg,color-mix(in srgb,${AC} 12%,transparent),rgba(255,255,255,.01))` : 'rgba(255,255,255,.025)',
      borderRadius: 16, padding: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '.13em', color: 'rgba(244,242,248,.45)', textTransform: 'uppercase' }}>
        {icon}{label}
      </div>
      {loading
        ? <div className="skeleton" style={{ height: 28, width: '60%', borderRadius: 6, marginTop: 12 }} />
        : <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 500, fontSize: 20, marginTop: 8, color: valueColor ?? '#f4f2f8' }}>{value}</div>
      }
    </div>
  )
}
