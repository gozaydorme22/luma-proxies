'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'

const AC  = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

const typeLabel: Record<string, string> = {
  residential_rotating: 'Residencial Rotativo',
  residential_sticky:   'Residencial Fixo',
  mobile:               'Mobile',
  datacenter:           'Datacenter',
  cpa:                  'CPA',
}

interface ProxyDetail {
  id: string; name: string; type: string; country: string
  status: string; host: string; port: number
  proxyUser: string; proxyPass: string
  allocatedGb: number; usedGb: number
  suspendReason: string | null; createdAt: string
}

function CopyBtn({ value }: { value: string }) {
  const [ok, setOk] = useState(false)
  function copy() {
    navigator.clipboard.writeText(value)
    setOk(true)
    setTimeout(() => setOk(false), 1500)
  }
  return (
    <button onClick={copy} title="Copiar" style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: ok ? '#34d399' : AC2, flexShrink: 0, transition: 'color .2s' }}>
      {ok
        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>}
    </button>
  )
}

function Field({ label, value, mono, secret }: { label: string; value: string; mono?: boolean; secret?: boolean }) {
  const [show, setShow] = useState(false)
  const display = secret && !show ? '••••••••••••' : value
  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.1em', color: 'rgba(244,242,248,.38)', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '11px 14px' }}>
        <span style={{ flex: 1, fontFamily: mono ? "'JetBrains Mono',monospace" : "'Manrope',sans-serif", fontSize: mono ? 13 : 14, color: 'rgba(244,242,248,.9)', wordBreak: 'break-all' }}>{display}</span>
        {secret && (
          <button onClick={() => setShow(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(244,242,248,.4)', padding: 0, display: 'flex' }}>
            {show
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.9 17.9A10.1 10.1 0 0 1 12 20C7 20 2.7 16.4 2 12c.3-1.4.9-2.7 1.8-3.8M6.5 6.5A10 10 0 0 1 12 4c5 0 9.3 3.6 10 8-.2.9-.5 1.7-.9 2.5M2 2l20 20"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>}
          </button>
        )}
        <CopyBtn value={value} />
      </div>
    </div>
  )
}

export default function ProxyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router  = useRouter()
  const [proxy, setProxy]     = useState<ProxyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [proto, setProto]     = useState<'http' | 'socks5'>('http')
  const [ipType, setIpType]   = useState<'rotating' | 'sticky'>('rotating')
  const [genQty, setGenQty]   = useState(10)
  const [genFmt, setGenFmt]   = useState('host:port:user:pass')
  const [genList, setGenList] = useState('')

  useEffect(() => {
    fetch(`/api/proxies/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProxy(d) })
      .finally(() => setLoading(false))
  }, [id])

  function buildConnStr() {
    if (!proxy) return ''
    const port = proto === 'socks5' ? proxy.port + 1 : proxy.port
    return `${proxy.host}:${port}:${proxy.proxyUser}:${proxy.proxyPass}`
  }

  function buildUsername() {
    if (!proxy) return ''
    if (ipType === 'sticky') return `${proxy.proxyUser}-session-${Math.random().toString(36).slice(2,8)}`
    return proxy.proxyUser
  }

  function generateList() {
    if (!proxy) return
    const port = proto === 'socks5' ? proxy.port + 1 : proxy.port
    const lines = Array.from({ length: genQty }, (_, i) => {
      const user = ipType === 'sticky' ? `${proxy.proxyUser}-session-${String(i+1).padStart(4,'0')}` : proxy.proxyUser
      switch (genFmt) {
        case 'host:port:user:pass': return `${proxy.host}:${port}:${user}:${proxy.proxyPass}`
        case 'proto://user:pass@host:port': return `${proto}://${user}:${proxy.proxyPass}@${proxy.host}:${port}`
        case 'user:pass@host:port': return `${user}:${proxy.proxyPass}@${proxy.host}:${port}`
        default: return `${proxy.host}:${port}:${user}:${proxy.proxyPass}`
      }
    })
    setGenList(lines.join('\n'))
  }

  function copyList() {
    if (genList) navigator.clipboard.writeText(genList)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, color: 'rgba(244,242,248,.35)', fontSize: 14 }}>Carregando...</div>
  )
  if (!proxy) return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <div style={{ fontSize: 15, color: 'rgba(244,242,248,.4)' }}>Proxy não encontrada.</div>
      <button onClick={() => router.push('/dashboard/proxies')} style={{ marginTop: 20, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 13, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>Voltar</button>
    </div>
  )

  const pct        = proxy.allocatedGb > 0 ? Math.min(100, Math.round((proxy.usedGb / proxy.allocatedGb) * 100)) : 0
  const remaining  = Math.max(0, proxy.allocatedGb - proxy.usedGb)
  const barColor   = pct >= 95 ? '#f87171' : pct >= 75 ? '#fbbf24' : '#34d399'
  const isActive   = proxy.status === 'active'
  const httpPort   = proxy.port
  const socks5Port = proxy.port + 1
  const curlUser   = buildUsername()
  const curlPort   = proto === 'socks5' ? socks5Port : httpPort
  const curlProto  = proto === 'socks5' ? 'socks5h' : 'http'

  const chip = (active: boolean) => ({
    background:   active ? AC : 'transparent',
    color:        active ? '#0a0612' : 'rgba(244,242,248,.55)',
    fontWeight:   700 as const,
    fontSize:     13,
    padding:      '9px 18px',
    borderRadius: 9,
    border:       'none',
    cursor:       'pointer' as const,
    fontFamily:   "'Manrope',sans-serif",
    transition:   'all .15s',
  })

  return (
    <div style={{ animation: 'lumaRise .35s ease both' }}>

      {/* BACK */}
      <button onClick={() => router.push('/dashboard/proxies')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'rgba(244,242,248,.5)', cursor: 'pointer', fontSize: 13, fontFamily: "'Manrope',sans-serif", padding: 0, marginBottom: 22 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Minhas Proxies
      </button>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: isActive ? '#34d399' : '#f87171', boxShadow: `0 0 8px ${isActive ? '#34d399' : '#f87171'}`, flexShrink: 0, display: 'inline-block' }}/>
            <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 26, margin: 0 }}>{proxy.name}</h1>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.08em', padding: '4px 10px', borderRadius: 7, background: `color-mix(in srgb,${AC} 20%,transparent)`, color: AC2 }}>
              {typeLabel[proxy.type] ?? proxy.type}
            </span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'rgba(244,242,248,.45)' }}>
            {isActive ? 'Proxy ativa e funcionando' : proxy.status === 'suspended' ? `Suspensa — ${proxy.suspendReason === 'quota_exceeded' ? 'cota esgotada' : 'suspensa manualmente'}` : 'Inativa'}
          </p>
        </div>
        {/* SALDO */}
        <div style={{ background: `linear-gradient(135deg,color-mix(in srgb,${AC} 14%,transparent),rgba(255,255,255,.02))`, border: `1px solid color-mix(in srgb,${AC} 22%,transparent)`, borderRadius: 16, padding: '14px 22px', textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.1em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase', marginBottom: 4 }}>Saldo</div>
          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 28, color: remaining < 1 ? '#f87171' : '#f4f2f8' }}>{remaining.toFixed(2)} GB</div>
          <div style={{ fontSize: 12, color: 'rgba(244,242,248,.4)', marginTop: 2 }}>de {proxy.allocatedGb} GB</div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 18, alignItems: 'start' }}>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* DADOS DA PROXY */}
          <section style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 14 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/></svg>
                DADOS DA PROXY
              </div>
              <CopyBtn value={buildConnStr()} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Host"    value={proxy.host}      mono />
              <Field label="Porta"   value={String(proto === 'socks5' ? socks5Port : httpPort)} mono />
              <Field label="Usuário" value={proxy.proxyUser} mono />
              <Field label="Senha"   value={proxy.proxyPass} mono secret />
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="String de conexão" value={buildConnStr()} mono />
            </div>
          </section>

          {/* PROTOCOLO */}
          <section style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 14, marginBottom: 16 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h6M9 16h6M9 8h6M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/></svg>
              PROTOCOLO
            </div>
            <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 5 }}>
              <button onClick={() => setProto('http')}   style={chip(proto === 'http')}>HTTP :{httpPort}</button>
              <button onClick={() => setProto('socks5')} style={chip(proto === 'socks5')}>SOCKS5 :{socks5Port}</button>
            </div>
          </section>

          {/* TIPO DE IP */}
          <section style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 14, marginBottom: 16 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2Z"/><path d="M12 8v4l3 3"/></svg>
              TIPO DE IP
            </div>
            <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: 5 }}>
              <button onClick={() => setIpType('rotating')} style={chip(ipType === 'rotating')}>Rotativo</button>
              <button onClick={() => setIpType('sticky')}   style={chip(ipType === 'sticky')}>Sessão Fixa</button>
            </div>
            {ipType === 'sticky' && (
              <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'rgba(244,242,248,.45)', lineHeight: 1.5 }}>
                Sessão fixa mantém o mesmo IP por até 30 min. Use <code style={{ fontFamily: "'JetBrains Mono',monospace", background: 'rgba(255,255,255,.07)', padding: '1px 5px', borderRadius: 4 }}>-session-ID</code> no usuário para identificar sessões.
              </p>
            )}
          </section>

          {/* GERAR LISTA */}
          <section style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 14, marginBottom: 18 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
              GERAR LISTA DE PROXIES
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.1em', color: 'rgba(244,242,248,.38)', textTransform: 'uppercase' }}>Quantidade</label>
                <input
                  type="number" min={1} max={1000} value={genQty}
                  onChange={e => setGenQty(Math.max(1, Math.min(1000, Number(e.target.value))))}
                  style={{ width: 90, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#f4f2f8', fontSize: 14, fontFamily: "'Manrope',sans-serif", padding: '9px 12px', outline: 'none' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.1em', color: 'rgba(244,242,248,.38)', textTransform: 'uppercase' }}>Formato</label>
                <select
                  value={genFmt} onChange={e => setGenFmt(e.target.value)}
                  style={{ background: '#13101e', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#f4f2f8', fontSize: 13.5, fontFamily: "'Manrope',sans-serif", padding: '9px 12px', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="host:port:user:pass">Host:Porta:Login:Senha</option>
                  <option value="proto://user:pass@host:port">Protocolo://Login:Senha@Host:Porta</option>
                  <option value="user:pass@host:port">Login:Senha@Host:Porta</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={generateList} style={{ background: AC, color: '#0a0612', fontWeight: 800, fontSize: 13.5, padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: "'Manrope',sans-serif", whiteSpace: 'nowrap' }}>
                  Gerar
                </button>
              </div>
            </div>
            {genList && (
              <div style={{ position: 'relative' }}>
                <textarea
                  readOnly value={genList}
                  style={{ width: '100%', minHeight: 160, background: '#0d0b12', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, color: 'rgba(244,242,248,.8)', fontSize: 12, fontFamily: "'JetBrains Mono',monospace", padding: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.7 }}
                />
                <button onClick={copyList} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 7, color: AC2, fontSize: 12, fontWeight: 700, fontFamily: "'Manrope',sans-serif", padding: '5px 12px', cursor: 'pointer' }}>Copiar</button>
              </div>
            )}
          </section>

          {/* CURL EXAMPLE */}
          <section style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 14 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 8-4 4 4 4M16 8l4 4-4 4"/></svg>
                EXEMPLO CURL
              </div>
              <CopyBtn value={`curl -x "${curlProto}://${proxy.host}:${curlPort}" -U "${curlUser}:${proxy.proxyPass}" https://api.ipify.org/`} />
            </div>
            <div style={{ background: '#0d0b12', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10, padding: '14px 16px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: 'rgba(244,242,248,.7)', lineHeight: 1.7, wordBreak: 'break-all' }}>
              <span style={{ color: '#c084fc' }}>curl</span>{' '}
              <span style={{ color: '#fbbf24' }}>-x</span>{' '}
              <span style={{ color: '#34d399' }}>&quot;{curlProto}://{proxy.host}:{curlPort}&quot;</span>{' '}
              <span style={{ color: '#fbbf24' }}>-U</span>{' '}
              <span style={{ color: '#34d399' }}>&quot;{curlUser}:{proxy.proxyPass}&quot;</span>{' '}
              <span>https://api.ipify.org/</span>
            </div>
          </section>
        </div>

        {/* RIGHT — INFORMAÇÕES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* INFO CARD */}
          <section style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 14, marginBottom: 18 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
              INFORMAÇÕES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <InfoRow label="Status" value={isActive ? 'Ativo' : 'Suspenso'} valueColor={isActive ? '#34d399' : '#f87171'} dot={isActive ? '#34d399' : '#f87171'} />
              <InfoRow label="Saldo" value={`${remaining.toFixed(2)} GB`} />
              <InfoRow label="Tipo" value={typeLabel[proxy.type] ?? proxy.type} />
              <InfoRow label="País" value={proxy.country === 'BR' ? '🇧🇷 Brazil' : proxy.country} />
              <InfoRow label="Protocolo" value={proto.toUpperCase()} />
            </div>
          </section>

          {/* USO */}
          <section style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: 22 }}>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 14, marginBottom: 16 }}>USO DA COTA</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 22, color: barColor }}>{proxy.usedGb.toFixed(2)} GB</span>
              <span style={{ fontSize: 12, color: 'rgba(244,242,248,.4)' }}>/ {proxy.allocatedGb} GB</span>
            </div>
            <div style={{ height: 8, borderRadius: 6, background: 'rgba(255,255,255,.07)', overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 6, background: `linear-gradient(90deg,${barColor},${barColor}aa)`, transition: 'width .4s ease' }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'rgba(244,242,248,.4)' }}>
              <span>{pct}% usado</span><span>{remaining.toFixed(2)} GB restante</span>
            </div>
            {pct >= 80 && (
              <div style={{ marginTop: 14, background: 'rgba(251,191,36,.08)', border: '1px solid rgba(251,191,36,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12.5, color: '#fbbf24', lineHeight: 1.5 }}>
                ⚠️ {pct >= 95 ? 'Cota quase esgotada. Recarregue agora.' : 'Menos de 20% restante.'}
              </div>
            )}
          </section>

          {/* RECARREGAR */}
          <a href="/dashboard/recarga" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 14, padding: '13px 0', borderRadius: 14, textDecoration: 'none', boxShadow: `0 8px 24px color-mix(in srgb,${AC} 35%,transparent)` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.3M21 4v5h-5"/></svg>
            Recarregar GB
          </a>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, valueColor, dot }: { label: string; value: string; valueColor?: string; dot?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 13, color: 'rgba(244,242,248,.45)' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: valueColor ?? '#f4f2f8' }}>
        {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, boxShadow: `0 0 6px ${dot}`, display: 'inline-block' }}/>}
        {value}
      </span>
    </div>
  )
}
