'use client'

import { useState, useEffect } from 'react'

const AC  = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

interface ProxyUsage { id: string; name: string; totalGb: number; usedGb: number; status: string }

function fmtGb(gb: number) {
  if (gb < 1) return (gb * 1024).toFixed(0) + ' MB'
  return gb.toFixed(gb % 1 === 0 ? 0 : 2).replace('.', ',') + ' GB'
}

function buildChart(data: number[], W: number, H: number, pad: number) {
  if (data.every(v => v === 0)) return { line: '', area: '' }
  const max = Math.max(...data)
  const n   = data.length
  const xs  = (i: number) => (i / (n - 1)) * W
  const ys  = (v: number) => H - pad - (v / max) * (H - pad * 2)
  let line  = ''
  data.forEach((v, i) => { line += (i === 0 ? 'M' : 'L') + xs(i).toFixed(1) + ' ' + ys(v).toFixed(1) + ' ' })
  return { line: line.trim(), area: line + `L ${W} ${H} L 0 ${H} Z` }
}

export default function ConsumoPage() {
  const [usage14d, setUsage14d] = useState<number[]>(new Array(14).fill(0))
  const [proxies, setProxies]   = useState<ProxyUsage[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/consumo')
      .then(r => r.json())
      .then(d => { setUsage14d(d.usage14d ?? new Array(14).fill(0)); setProxies(d.proxies ?? []) })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  const sumGb  = usage14d.reduce((a, b) => a + b, 0)
  const avgGb  = sumGb / usage14d.length
  const peakGb = Math.max(...usage14d)
  const chart  = buildChart(usage14d, 720, 220, 20)

  const totalUsed  = proxies.reduce((s, p) => s + p.usedGb, 0)
  const totalLimit = proxies.reduce((s, p) => s + p.totalGb, 0)

  return (
    <div style={{ animation: 'lumaRise .4s ease both' }}>
      <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 30, letterSpacing: '-.02em', margin: 0 }}>Consumo de dados</h1>
      <p style={{ fontSize: 15, color: 'rgba(244,242,248,.55)', margin: '8px 0 0' }}>Acompanhe quanto cada proxy consumiu. Dados atualizados via API do fornecedor.</p>

      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginTop: 24 }}>
        {[
          { label: 'Total usado', value: fmtGb(totalUsed), color: AC2 },
          { label: 'Disponível', value: fmtGb(Math.max(0, totalLimit - totalUsed)), color: '#34d399' },
          { label: 'Média / dia (14d)', value: fmtGb(avgGb), color: '#f4f2f8' },
          { label: 'Pico (1 dia)', value: fmtGb(peakGb), color: '#fbbf24' },
        ].map(s => (
          <div key={s.label} style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', borderRadius: 15, padding: 20 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '.13em', color: 'rgba(244,242,248,.45)', textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 28, marginTop: 10, color: s.color }}>{loading ? '–' : s.value}</div>
          </div>
        ))}
      </div>

      {/* CHART */}
      <div style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: '22px 24px', marginTop: 16 }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.14em', color: 'rgba(244,242,248,.45)', textTransform: 'uppercase' }}>Histórico · últimos 14 dias</div>
        {sumGb === 0 && !loading && (
          <p style={{ fontSize: 13, color: 'rgba(244,242,248,.35)', marginTop: 12 }}>Histórico disponível após integração com API do fornecedor.</p>
        )}
        <div style={{ marginTop: 18 }}>
          <svg viewBox="0 0 720 220" preserveAspectRatio="none" style={{ width: '100%', height: 220, display: 'block' }}>
            <defs>
              <linearGradient id="lumaArea2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={`color-mix(in srgb,${AC} 55%,transparent)`}/>
                <stop offset="100%" stopColor={`color-mix(in srgb,${AC} 0%,transparent)`}/>
              </linearGradient>
            </defs>
            <line x1="0" y1="55"  x2="720" y2="55"  stroke="rgba(255,255,255,.05)" strokeWidth="1"/>
            <line x1="0" y1="110" x2="720" y2="110" stroke="rgba(255,255,255,.05)" strokeWidth="1"/>
            <line x1="0" y1="165" x2="720" y2="165" stroke="rgba(255,255,255,.05)" strokeWidth="1"/>
            {chart.area && <path d={chart.area} fill="url(#lumaArea2)"/>}
            {chart.line && <path d={chart.line} fill="none" stroke={AC2} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: 'rgba(244,242,248,.35)' }}>
            <span>14d atrás</span><span>10d</span><span>6d</span><span>2d</span><span>hoje</span>
          </div>
        </div>
      </div>

      {/* POR PROXY */}
      <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 18, margin: '28px 0 14px' }}>Consumo por proxy</h2>

      {loading ? (
        <div style={{ color: 'rgba(244,242,248,.3)', fontSize: 14 }}>Carregando...</div>
      ) : proxies.length === 0 ? (
        <div style={{ padding: '30px 0', textAlign: 'center', border: '1px dashed rgba(255,255,255,.08)', borderRadius: 14, color: 'rgba(244,242,248,.3)', fontSize: 14 }}>
          Nenhuma proxy ativa ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {proxies.map(p => {
            const pct      = p.totalGb > 0 ? Math.min(100, Math.round((p.usedGb / p.totalGb) * 100)) : 0
            const barColor = pct >= 95 ? '#f87171' : pct >= 75 ? '#fbbf24' : AC2
            return (
              <div key={p.id} style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 14, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 14.5 }}>{p.name}</span>
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>
                    <span style={{ color: barColor }}>{fmtGb(p.usedGb)}</span>
                    <span style={{ color: 'rgba(244,242,248,.4)' }}> / {fmtGb(p.totalGb)}</span>
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 6, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 6, background: `linear-gradient(90deg,${AC},${AC2})` }}/>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11.5, color: 'rgba(244,242,248,.4)' }}>
                  <span>{pct}% consumido</span>
                  <span>{fmtGb(Math.max(0, p.totalGb - p.usedGb))} restante</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
