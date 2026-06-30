'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ProxyResult } from '@/app/api/proxy-check/route'

const AC = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

function flag(code: string | null) {
  if (!code || code.length !== 2) return '🌐'
  const base = 0x1F1E6
  return String.fromCodePoint(
    base + code.charCodeAt(0) - 65,
    base + code.charCodeAt(1) - 65,
  )
}

function latencyColor(ms: number) {
  if (ms < 600) return '#34d399'
  if (ms < 1500) return '#fbbf24'
  return '#f87171'
}

const PLACEHOLDER = `Uma proxy por linha. Formatos suportados:
IP:PORTA:USUARIO:SENHA
IP:PORTA
USUARIO:SENHA@IP:PORTA
socks5://USUARIO:SENHA@IP:PORTA
http://USUARIO:SENHA@IP:PORTA`

export default function ProxyCheckerPage() {
  const [input, setInput]     = useState('')
  const [results, setResults] = useState<ProxyResult[]>([])
  const [loading, setLoading] = useState(false)
  const [tested, setTested]   = useState(0)
  const [total, setTotal]     = useState(0)

  async function handleCheck() {
    const proxies = input.split('\n').map(l => l.trim()).filter(Boolean)
    if (!proxies.length) return

    setLoading(true)
    setResults([])
    setTested(0)
    setTotal(proxies.length)

    const BATCH = 10
    for (let i = 0; i < proxies.length; i += BATCH) {
      const batch = proxies.slice(i, i + BATCH)
      try {
        const res = await fetch('/api/proxy-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proxies: batch }),
        })
        const data: ProxyResult[] = await res.json()
        setResults(prev => [...prev, ...data])
        setTested(prev => prev + data.length)
      } catch {
        setTested(prev => prev + batch.length)
      }
    }

    setLoading(false)
  }

  function exportCsv() {
    const header = 'Proxy,Host,Porta,IP de Saída,Status,Latência (ms),País,Cidade,ISP,Anônimo'
    const rows = results.map(r =>
      [
        `"${r.raw}"`,
        r.host,
        r.port,
        r.exitIp ?? '-',
        r.status,
        r.latency ?? '-',
        r.country ?? '-',
        r.city ?? '-',
        `"${r.isp ?? '-'}"`,
        r.anonymous ? 'Sim' : 'Não',
      ].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'proxies-resultado.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const successful = results.filter(r => r.status === 'success').length
  const hasResults = results.length > 0

  return (
    <div style={{ minHeight: '100vh', background: '#08070c', color: '#f4f2f8', fontFamily: 'Manrope, sans-serif' }}>

      {/* Nav */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, borderBottom: '1px solid rgba(255,255,255,.07)', background: 'rgba(8,7,12,.85)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: AC, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a0612" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" /></svg>
            </span>
            <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 16, color: '#f4f2f8' }}>Luma</span>
          </Link>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 600, color: 'rgba(244,242,248,.65)', textDecoration: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            Voltar
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '100px 20px 80px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid color-mix(in srgb,${AC} 28%,transparent)`, background: `color-mix(in srgb,${AC} 10%,transparent)`, borderRadius: 999, padding: '6px 14px', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.16em', color: AC2, textTransform: 'uppercase', marginBottom: 20 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            Ferramenta gratuita
          </div>
          <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 48, lineHeight: 1.0, letterSpacing: '-.025em', margin: 0 }}>
            Proxy <span style={{ color: AC }}>Checker</span>
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(244,242,248,.55)', margin: '16px auto 0', maxWidth: 480 }}>
            Teste proxies HTTP, HTTPS e SOCKS5 com geolocalização, latência e status em tempo real.
          </p>
        </div>

        {/* Input panel */}
        <div style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: '22px 24px 24px' }}>
          <label style={{ display: 'block', fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.14em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase', marginBottom: 12 }}>
            Proxys <span style={{ color: 'rgba(244,242,248,.25)' }}>· máx. 50</span>
          </label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={7}
            style={{
              width: '100%', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 10, padding: '12px 14px', color: '#f4f2f8',
              fontFamily: "'JetBrains Mono',monospace", fontSize: 13, lineHeight: 1.7,
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              caretColor: AC,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = `color-mix(in srgb,${AC} 40%,transparent)` }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' }}
          />
          <button
            onClick={handleCheck}
            disabled={loading || !input.trim()}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '14px 0', marginTop: 14, opacity: loading || !input.trim() ? 0.6 : 1 }}
          >
            {loading
              ? <><span style={{ display: 'inline-block', animation: 'lumaSpin 1s linear infinite', marginRight: 8 }}>◌</span>Testando... ({tested}/{total})</>
              : <>Testar <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></>
            }
          </button>
        </div>

        {/* Results */}
        {(hasResults || loading) && (
          <div style={{ marginTop: 18, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, overflow: 'hidden' }}>

            {/* Results header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Resultado</span>
                {loading && (
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'rgba(244,242,248,.4)', letterSpacing: '.08em' }}>
                    processando {tested}/{total}...
                  </span>
                )}
              </div>
              {hasResults && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'rgba(244,242,248,.45)' }}>
                    <span style={{ color: '#34d399' }}>{successful}</span> / {results.length} com sucesso
                  </span>
                  <button
                    onClick={exportCsv}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, padding: '7px 13px', color: 'rgba(244,242,248,.8)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.09)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    Exportar CSV
                  </button>
                </div>
              )}
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                    {['Endereço IP', 'Porta', 'IP de saída', 'Estado', 'Latência', 'Local', 'ISP', 'Anônimo'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.1em', color: 'rgba(244,242,248,.35)', textTransform: 'uppercase', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,.04)', transition: 'background .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,.025)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = '' }}
                    >
                      <td style={{ padding: '13px 16px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: 'rgba(244,242,248,.8)', whiteSpace: 'nowrap' }}>
                        {r.host || r.raw.split(':')[0]}
                      </td>
                      <td style={{ padding: '13px 16px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: 'rgba(244,242,248,.5)' }}>
                        {r.port || '-'}
                      </td>
                      <td style={{ padding: '13px 16px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: r.exitIp ? '#f4f2f8' : 'rgba(244,242,248,.3)', whiteSpace: 'nowrap' }}>
                        {r.exitIp ?? '—'}
                      </td>
                      <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                        {r.status === 'success' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#34d399', fontWeight: 700, fontSize: 13 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                            Sucesso
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#f87171', fontWeight: 700, fontSize: 13 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                            {r.error ?? 'Falha'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '13px 16px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, whiteSpace: 'nowrap' }}>
                        {r.latency != null
                          ? <span style={{ color: latencyColor(r.latency) }}>{r.latency} ms</span>
                          : <span style={{ color: 'rgba(244,242,248,.25)' }}>—</span>}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, whiteSpace: 'nowrap', color: 'rgba(244,242,248,.75)' }}>
                        {r.country
                          ? <>{flag(r.countryCode)} {r.city ? `${r.city}, ` : ''}{r.region ? `${r.region}, ` : ''}{r.countryCode}</>
                          : <span style={{ color: 'rgba(244,242,248,.25)' }}>—</span>}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: 'rgba(244,242,248,.6)', maxWidth: 200 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.isp ?? <span style={{ color: 'rgba(244,242,248,.25)' }}>—</span>}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13 }}>
                        {r.anonymous
                          ? <span style={{ color: '#34d399', fontWeight: 600 }}>Anônimo</span>
                          : <span style={{ color: 'rgba(244,242,248,.3)' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                  {/* Loading skeleton rows */}
                  {loading && Array.from({ length: Math.min(total - tested, 3) }).map((_, i) => (
                    <tr key={`sk-${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} style={{ padding: '13px 16px' }}>
                          <span style={{ display: 'block', height: 14, borderRadius: 6, background: 'rgba(255,255,255,.05)', width: j === 0 ? 120 : j === 5 ? 100 : 60, animation: 'lumaBlink 1.4s infinite' }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!loading && !hasResults && (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: 'rgba(244,242,248,.35)', fontSize: 14 }}>
                Preencha uma ou mais proxies e clique em Testar.
              </div>
            )}
          </div>
        )}

        {/* Empty state before first test */}
        {!hasResults && !loading && (
          <div style={{ marginTop: 18, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.015)', borderRadius: 18, padding: '40px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Resultado</span>
            </div>
            <p style={{ margin: 0, textAlign: 'center', color: 'rgba(244,242,248,.35)', fontSize: 14, paddingTop: 10 }}>
              Preencha uma ou mais proxies (uma por linha) e clique em Testar.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
