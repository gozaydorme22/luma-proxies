'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/toast'

const AC  = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

interface ProxyDetail {
  id: string; name: string; type: string; country: string
  status: string; host: string; port: number
  proxyUser: string; proxyPass: string
  allocatedGb: number; usedGb: number
  suspendReason: string | null; createdAt: string
}

function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [ok, setOk] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setOk(true)
      toast(label ? `${label} copiado!` : 'Copiado!', 'success')
      setTimeout(() => setOk(false), 1500)
    } catch {
      toast('Não foi possível copiar', 'error')
    }
  }
  return (
    <button onClick={copy} title="Copiar" style={{
      background: ok ? 'rgba(52,211,153,.12)' : 'rgba(255,255,255,.07)',
      border: `1px solid ${ok ? 'rgba(52,211,153,.3)' : 'rgba(255,255,255,.1)'}`,
      borderRadius: 8, padding: '8px 16px', display: 'inline-flex',
      alignItems: 'center', gap: 6, cursor: 'pointer',
      color: ok ? '#34d399' : AC2, flexShrink: 0,
      fontSize: 13, fontWeight: 700, fontFamily: "'Manrope',sans-serif",
      transition: 'color .2s, background .2s, border-color .2s',
    }}>
      {ok
        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>}
      {ok ? 'Copiado' : 'Copiar'}
    </button>
  )
}

export default function ProxyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }    = use(params)
  const router    = useRouter()
  const [proxy, setProxy]     = useState<ProxyDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/proxies/${id}`)
      .then(r => {
        if (r.status === 401) { router.replace('/login'); return null }
        return r.ok ? r.json() : null
      })
      .then(d => { if (d) setProxy(d) })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, color: 'rgba(244,242,248,.35)', fontSize: 14 }}>Carregando...</div>
  )
  if (!proxy) return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <div style={{ fontSize: 15, color: 'rgba(244,242,248,.4)' }}>Proxy não encontrada.</div>
      <button onClick={() => router.push('/dashboard/proxies')} style={{ marginTop: 20, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 13, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>Voltar</button>
    </div>
  )

  const connStr   = `${proxy.host}:${proxy.port}:${proxy.proxyUser}:${proxy.proxyPass}`
  const pct       = proxy.allocatedGb > 0 ? Math.min(100, Math.round((proxy.usedGb / proxy.allocatedGb) * 100)) : 0
  const remaining = Math.max(0, proxy.allocatedGb - proxy.usedGb)
  const barColor  = pct >= 95 ? '#f87171' : pct >= 75 ? '#fbbf24' : '#34d399'
  const isActive   = proxy.status === 'active'
  const isSuspended = proxy.status === 'suspended' || proxy.status === 'suspensa'
  const statusLabel = isActive ? 'Ativa' : isSuspended ? 'Suspensa' : proxy.status === 'removed' ? 'Removida' : 'Inativa'

  return (
    <div style={{ animation: 'lumaRise .35s ease both', maxWidth: 560 }}>

      {/* BACK */}
      <button onClick={() => router.push('/dashboard/proxies')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'rgba(244,242,248,.5)', cursor: 'pointer', fontSize: 13, fontFamily: "'Manrope',sans-serif", padding: 0, marginBottom: 28 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Minhas Proxys
      </button>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: isActive ? '#34d399' : '#f87171', boxShadow: `0 0 8px ${isActive ? '#34d399' : '#f87171'}`, flexShrink: 0 }}/>
        <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 20, margin: 0 }}>{proxy.name}</h1>
        <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.06em', padding: '3px 9px', borderRadius: 6, background: `color-mix(in srgb,${AC} 18%,transparent)`, color: AC2 }}>
          {statusLabel}
        </span>
      </div>

      {/* CONEXÃO */}
      <section style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.1em', color: 'rgba(244,242,248,.38)', textTransform: 'uppercase', marginBottom: 14 }}>String de conexão</div>
        <div style={{ background: '#0d0b12', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '16px 18px', fontFamily: "'JetBrains Mono',monospace", fontSize: 13.5, color: '#c084fc', wordBreak: 'break-all', lineHeight: 1.6, marginBottom: 14 }}>
          {connStr}
        </div>
        <CopyBtn value={connStr} label="String de conexão" />
      </section>

      {/* USO DE GB */}
      <section style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.1em', color: 'rgba(244,242,248,.38)', textTransform: 'uppercase' }}>Uso de GB</div>
          <span style={{ fontSize: 13, color: 'rgba(244,242,248,.4)' }}>{proxy.usedGb.toFixed(2)} / {proxy.allocatedGb} GB</span>
        </div>
        <div style={{ height: 8, borderRadius: 6, background: 'rgba(255,255,255,.07)', overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 6, background: `linear-gradient(90deg,${barColor},${barColor}aa)`, transition: 'width .4s ease' }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(244,242,248,.4)' }}>
          <span>{pct}% usado</span>
          <span style={{ color: remaining < 1 ? '#f87171' : 'rgba(244,242,248,.4)' }}>{remaining.toFixed(2)} GB restante</span>
        </div>
        {pct >= 80 && (
          <div style={{ marginTop: 14, background: 'rgba(251,191,36,.07)', border: '1px solid rgba(251,191,36,.18)', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: '#fbbf24' }}>
            ⚠️ {pct >= 95 ? 'Cota quase esgotada. Recarregue agora.' : 'Menos de 20% restante.'}
          </div>
        )}
      </section>

      {/* RECARREGAR */}
      <a href="?checkout=1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 14, padding: '14px 0', borderRadius: 14, textDecoration: 'none', boxShadow: `0 8px 24px color-mix(in srgb,${AC} 35%,transparent)` }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.3M21 4v5h-5"/></svg>
        Recarregar GB
      </a>
    </div>
  )
}
