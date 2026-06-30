'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { User } from 'firebase/auth'
import { QRCodeSVG } from 'qrcode.react'

const AC  = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

const PLANS = [
  { gb: '3',  price: 18.90,  label: '3 GB',  perGb: 6.30  },
  { gb: '5',  price: 31.90,  label: '5 GB',  perGb: 6.38  },
  { gb: '10', price: 60.90,  label: '10 GB', perGb: 6.09  },
  { gb: '20', price: 120.90, label: '20 GB', perGb: 6.045 },
]

const COUPON_PERCENT = 0.10

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtPerGb(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}/GB`
}

function maskCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

const LABEL: React.CSSProperties = {
  fontFamily: "'JetBrains Mono',monospace",
  fontSize: 10,
  letterSpacing: '.14em',
  color: 'rgba(244,242,248,.3)',
  textTransform: 'uppercase',
  marginBottom: 12,
}

interface Props {
  initialPlan?: string
  user: User | null | undefined
  onClose: () => void
}

export function CheckoutModal({ initialPlan = '5', user, onClose }: Props) {
  const planIdx = PLANS.findIndex(p => p.gb === initialPlan)
  const [idx, setIdx]       = useState(planIdx >= 0 ? planIdx : 2)
  const [method, setMethod] = useState<'pix' | 'crypto'>('pix')
  const [step, setStep]     = useState<'form' | 'summary' | 'pix'>('form')

  const [couponEligible, setCouponEligible] = useState<boolean | null>(null)
  const [couponInput, setCouponInput]       = useState('')
  const [couponApplied, setCouponApplied]   = useState<string | null>(null)
  const [couponError, setCouponError]       = useState<string | null>(null)
  const [couponLoading, setCouponLoading]   = useState(false)
  const couponRef = useRef<HTMLInputElement>(null)

  const [whatsapp, setWhatsapp] = useState('')
  const [cpf, setCpf]           = useState('')

  const [loading, setLoading]   = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  // PIX state
  const [pixCode,   setPixCode]   = useState('')
  const [pixId,     setPixId]     = useState('')
  const [pixStatus, setPixStatus] = useState<'pending' | 'completed' | 'failed'>('pending')
  const [copied,    setCopied]    = useState(false)

  const plan        = PLANS[idx]
  const discountAmt = couponApplied ? plan.price * COUPON_PERCENT : 0
  const total       = plan.price - discountAmt
  const loggedIn    = user !== undefined && user !== null
  const cpfValid    = cpf.replace(/\D/g, '').length === 11

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (!user) return
    fetch('/api/coupon/status')
      .then(r => r.json())
      .then(d => {
        setCouponEligible(d.eligible)
        if (d.eligible) { setCouponApplied('LUMA10'); setCouponInput('LUMA10') }
      })
      .catch(() => setCouponEligible(false))
  }, [user])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (step === 'pix' && pixStatus !== 'completed') { setStep('summary'); return }
      if (step === 'summary') { setStep('form'); return }
      onClose()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose, step, pixStatus])

  // Poll SyncPay status every 3s while on PIX step
  useEffect(() => {
    if (step !== 'pix' || pixStatus !== 'pending' || !pixId) return
    const iv = setInterval(async () => {
      try {
        const r = await fetch(`/api/pagamento/status?id=${encodeURIComponent(pixId)}`)
        const d = await r.json() as { status?: string }
        if (d.status === 'completed' || d.status === 'failed') {
          setPixStatus(d.status as 'completed' | 'failed')
          clearInterval(iv)
        }
      } catch { /* network hiccup, retry next tick */ }
    }, 3000)
    return () => clearInterval(iv)
  }, [step, pixId, pixStatus])

  function removeCoupon() {
    setCouponApplied(null); setCouponInput(''); setCouponError(null)
  }

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase()
    setCouponError(null)
    if (!code) return
    if (code !== 'LUMA10') { setCouponError('Cupom inválido.'); return }
    setCouponLoading(true)
    try {
      const d = await fetch('/api/coupon/status').then(r => r.json()) as { eligible: boolean }
      setCouponEligible(d.eligible)
      if (!d.eligible) { setCouponError('Cupom já utilizado ou não disponível para sua conta.'); return }
      setCouponApplied('LUMA10')
    } catch {
      setCouponError('Erro ao verificar cupom. Tente novamente.')
    } finally {
      setCouponLoading(false)
    }
  }

  async function handleCopyPix() {
    try {
      await navigator.clipboard.writeText(pixCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }

  async function handlePay() {
    setPayError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/pagamento/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gb:       Number(plan.gb),
          cpf,
          whatsapp: whatsapp.trim() || null,
          coupon:   couponApplied,
        }),
      })

      let data: { pix_code?: string; identifier?: string; error?: string } = {}
      try {
        data = await res.json()
      } catch {
        setPayError(`Erro ${res.status}: resposta inesperada do servidor.`)
        return
      }

      if (!res.ok) {
        setPayError(data.error ?? `Erro ${res.status} ao gerar PIX.`)
        return
      }

      setPixCode(data.pix_code ?? '')
      setPixId(data.identifier ?? '')
      setPixStatus('pending')
      setStep('pix')
    } catch (e) {
      setPayError(e instanceof Error ? e.message : 'Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const headerTitle = step === 'form' ? 'Finalizar compra'
    : step === 'summary' ? 'Resumo do pedido'
    : pixStatus === 'completed' ? 'Pagamento confirmado'
    : 'Aguardando PIX'

  const headerSub = step === 'form' ? 'Proxy Residencial Rotativa'
    : step === 'summary' ? `${plan.label} · ${method === 'pix' ? 'PIX' : 'Criptomoeda'}`
    : `${plan.label} · ${fmt(total)}`

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,.72)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
        animation: 'lumaRise .18s ease both',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 540, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
      <div
        className="checkout-modal-box"
        style={{
          width: '100%',
          background: '#0f0d18',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 22,
          boxShadow: '0 40px 100px rgba(0,0,0,.85), 0 0 0 1px rgba(168,85,247,.12)',
          maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >

        {/* HEADER */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,.07)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          {(step === 'summary' || (step === 'pix' && pixStatus !== 'completed')) && (
            <button
              onClick={() => step === 'pix' ? setStep('summary') : setStep('form')}
              style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.06)', border: 'none', cursor: 'pointer', color: 'rgba(244,242,248,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 18, color: '#f4f2f8' }}>
              {headerTitle}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.1em', color: 'rgba(244,242,248,.3)', textTransform: 'uppercase', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {headerSub}
            </div>
          </div>
          {/* X button — dentro do header, sem problema de clipping */}
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.06)', border: 'none', cursor: 'pointer', color: 'rgba(244,242,248,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* ── STEP 1: FORM ── */}
        {step === 'form' && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>

              {/* Auth loading */}
              {user === undefined && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '32px 0', color: 'rgba(244,242,248,.35)', fontSize: 14 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'lumaSpin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-3.6-7.2"/></svg>
                  Verificando sua sessão...
                </div>
              )}

              {/* Not logged in */}
              {user === null && (
                <div style={{ border: `1px solid color-mix(in srgb,${AC} 22%,transparent)`, background: `color-mix(in srgb,${AC} 7%,transparent)`, borderRadius: 14, padding: '26px 22px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>🔐</div>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 17, marginBottom: 8 }}>Entre para continuar</div>
                  <p style={{ fontSize: 14, color: 'rgba(244,242,248,.5)', margin: '0 0 18px', lineHeight: 1.6 }}>
                    Crie uma conta grátis ou entre para finalizar a compra do plano <b style={{ color: '#fff' }}>{plan.label}</b>.
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <Link href={`/cadastro?redirect=${encodeURIComponent(`/?checkout=${plan.gb}`)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: AC, color: '#ffffff', fontWeight: 800, fontSize: 14, padding: '11px 20px', borderRadius: 11, textDecoration: 'none', boxShadow: `0 8px 24px color-mix(in srgb,${AC} 44%,transparent)` }}>
                      Criar conta grátis
                    </Link>
                    <Link href={`/login?redirect=${encodeURIComponent(`/?checkout=${plan.gb}`)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#f4f2f8', fontWeight: 700, fontSize: 14, padding: '11px 18px', borderRadius: 11, textDecoration: 'none' }}>
                      Entrar
                    </Link>
                  </div>
                </div>
              )}

              {/* Plan selector */}
              <div>
                <div style={LABEL}>Selecione o plano</div>
                <div className="checkout-plan-grid">
                  {PLANS.map((p, i) => {
                    const active     = i === idx
                    const hasDisc    = !!couponApplied
                    const finalPrice = hasDisc ? p.price * (1 - COUPON_PERCENT) : p.price
                    return (
                      <button
                        key={p.gb}
                        onClick={() => setIdx(i)}
                        style={{
                          border: active ? `1.5px solid ${AC}` : '1px solid rgba(255,255,255,.09)',
                          background: active ? `linear-gradient(180deg,color-mix(in srgb,${AC} 18%,transparent),rgba(255,255,255,.01))` : 'rgba(255,255,255,.025)',
                          borderRadius: 12, padding: '14px 6px', cursor: 'pointer', textAlign: 'center',
                          boxShadow: active ? `0 6px 20px color-mix(in srgb,${AC} 22%,transparent)` : 'none',
                          transition: 'all .12s',
                        }}
                      >
                        <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 16, color: '#f4f2f8' }}>{p.label}</div>
                        {hasDisc ? (
                          <>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: 'rgba(244,242,248,.25)', textDecoration: 'line-through', marginTop: 5 }}>{fmt(p.price)}</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#34d399', marginTop: 2 }}>{fmt(finalPrice)}</div>
                          </>
                        ) : (
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: active ? AC2 : 'rgba(244,242,248,.35)', marginTop: 5 }}>{fmt(p.price)}</div>
                        )}
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: 'rgba(244,242,248,.2)', marginTop: 4 }}>
                          {hasDisc ? fmtPerGb(finalPrice / Number(p.gb)) : fmtPerGb(p.perGb)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Coupon */}
              {loggedIn && (
                <div>
                  <div style={LABEL}>Cupom de desconto</div>
                  {couponApplied ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(52,211,153,.2)', background: 'rgba(52,211,153,.05)', borderRadius: 12, padding: '12px 16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: 'rgba(52,211,153,.12)', flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      </span>
                      <div style={{ flex: 1, fontSize: 14 }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, color: '#34d399', letterSpacing: '.06em' }}>{couponApplied}</span>
                        <span style={{ color: 'rgba(244,242,248,.45)' }}> · 10% de desconto</span>
                      </div>
                      <button onClick={removeCoupon} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(244,242,248,.25)', fontSize: 20, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          ref={couponRef}
                          value={couponInput}
                          onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null) }}
                          onKeyDown={e => { if (e.key === 'Enter') applyCoupon() }}
                          placeholder="Ex: LUMA10"
                          style={{
                            flex: 1, background: 'rgba(255,255,255,.04)',
                            border: `1px solid ${couponError ? 'rgba(248,113,113,.4)' : 'rgba(255,255,255,.1)'}`,
                            borderRadius: 11, padding: '12px 16px', color: '#f4f2f8', fontSize: 14,
                            fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.06em', outline: 'none',
                            transition: 'border-color .12s',
                          }}
                        />
                        <button
                          onClick={applyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                          style={{
                            background: couponInput.trim() ? AC : 'rgba(255,255,255,.05)',
                            color: couponInput.trim() ? '#ffffff' : 'rgba(244,242,248,.25)',
                            border: 'none', borderRadius: 11, padding: '12px 20px',
                            cursor: couponInput.trim() ? 'pointer' : 'not-allowed',
                            fontWeight: 700, fontSize: 14, fontFamily: "'Manrope',sans-serif",
                            flexShrink: 0, transition: 'all .12s',
                          }}
                        >
                          {couponLoading ? '...' : 'Aplicar'}
                        </button>
                      </div>
                      {couponError && <div style={{ marginTop: 8, fontSize: 13, color: '#f87171' }}>{couponError}</div>}
                    </>
                  )}
                </div>
              )}

              {/* Payment method */}
              {loggedIn && (
                <div>
                  <div style={LABEL}>Método de pagamento</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {([
                      { key: 'pix' as const, label: 'PIX', sub: 'Ativação em ~30s',
                        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg> },
                      { key: 'crypto' as const, label: 'Criptomoeda', sub: 'BTC · ETH · USDT',
                        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727"/></svg> },
                    ] as const).map(m => {
                      const isCrypto = m.key === 'crypto'
                      return (
                        <button
                          key={m.key}
                          onClick={() => !isCrypto && setMethod(m.key)}
                          style={{
                            flex: '1 1 140px',
                            border: method === m.key ? `1.5px solid ${AC}` : '1px solid rgba(255,255,255,.09)',
                            background: method === m.key ? `color-mix(in srgb,${AC} 10%,transparent)` : 'rgba(255,255,255,.02)',
                            borderRadius: 12, padding: '12px 14px',
                            cursor: isCrypto ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 10,
                            boxShadow: method === m.key ? `0 4px 16px color-mix(in srgb,${AC} 16%,transparent)` : 'none',
                            transition: 'all .12s',
                            opacity: isCrypto ? 0.4 : 1,
                            minWidth: 0,
                          }}
                        >
                          <span style={{ color: method === m.key ? AC2 : 'rgba(244,242,248,.35)', flexShrink: 0 }}>{m.icon}</span>
                          <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, fontSize: 13, color: '#f4f2f8', whiteSpace: 'nowrap' }}>{m.label}</span>
                              {isCrypto && <span style={{ fontSize: 8, letterSpacing: '.1em', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 999, padding: '2px 6px', color: 'rgba(244,242,248,.7)', fontWeight: 600, flexShrink: 0 }}>EM BREVE</span>}
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(244,242,248,.38)', marginTop: 2, whiteSpace: 'nowrap' }}>{m.sub}</div>
                          </div>
                          {method === m.key && (
                            <span style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%', background: AC, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Contato — WhatsApp + CPF */}
              {loggedIn && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(244,242,248,.4)', fontFamily: "'JetBrains Mono',monospace" }}>CPF</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cpf}
                        onChange={e => setCpf(maskCpf(e.target.value))}
                        placeholder="000.000.000-00"
                        style={{
                          background: 'rgba(255,255,255,.04)',
                          border: `1px solid ${cpf && !cpfValid ? 'rgba(248,113,113,.4)' : 'rgba(255,255,255,.1)'}`,
                          borderRadius: 11, padding: '13px 16px', color: '#f4f2f8', fontSize: 14,
                          fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.06em', outline: 'none',
                          transition: 'border-color .12s', width: '100%', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(244,242,248,.4)', fontFamily: "'JetBrains Mono',monospace" }}>Telefone</label>
                      <input
                        type="tel"
                        value={whatsapp}
                        onChange={e => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        placeholder="(00) 00000-0000"
                        style={{
                          background: 'rgba(255,255,255,.04)',
                          border: '1px solid rgba(255,255,255,.1)',
                          borderRadius: 11, padding: '13px 16px', color: '#f4f2f8', fontSize: 14,
                          fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.04em', outline: 'none',
                          width: '100%', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(244,242,248,.3)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    Confirmação para <strong style={{ color: 'rgba(244,242,248,.5)' }}>{user?.email}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Continuar CTA */}
            {loggedIn && (
              <div style={{ padding: '14px 24px 20px', borderTop: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
                <button
                  onClick={() => { if (cpfValid) setStep('summary') }}
                  disabled={!cpfValid}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                    background: cpfValid ? AC : 'rgba(255,255,255,.06)',
                    color: cpfValid ? '#ffffff' : 'rgba(244,242,248,.25)',
                    fontWeight: 800, fontSize: 15,
                    padding: '15px 0', border: 'none', borderRadius: 13,
                    cursor: cpfValid ? 'pointer' : 'not-allowed',
                    boxShadow: cpfValid ? `0 10px 32px color-mix(in srgb,${AC} 44%,transparent)` : 'none',
                    fontFamily: "'Manrope',sans-serif",
                    transition: 'all .15s',
                  }}
                >
                  Continuar
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
                {!cpfValid && cpf.length > 0 && (
                  <div style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: '#f87171' }}>
                    Preencha um CPF válido para continuar.
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── STEP 2: SUMMARY ── */}
        {step === 'summary' && (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Line items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 15, color: 'rgba(244,242,248,.75)' }}>Proxy Residencial {plan.label}</span>
                  <span style={{ fontSize: 15, color: 'rgba(244,242,248,.75)' }}>{fmt(plan.price)}</span>
                </div>
                {couponApplied && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'rgba(244,242,248,.55)' }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.2)', borderRadius: 5, padding: '2px 7px', color: '#34d399', letterSpacing: '.05em' }}>{couponApplied}</span>
                      desconto 10%
                    </span>
                    <span style={{ fontSize: 14, color: 'rgba(52,211,153,.8)' }}>− {fmt(discountAmt)}</span>
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,.07)', margin: '24px 0' }} />

              {/* Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: 'rgba(244,242,248,.4)' }}>Total</span>
                <div style={{ textAlign: 'right' }}>
                  {couponApplied && (
                    <div style={{ fontSize: 13, color: 'rgba(244,242,248,.25)', textDecoration: 'line-through', marginBottom: 3 }}>{fmt(plan.price)}</div>
                  )}
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 28, lineHeight: 1, color: couponApplied ? '#34d399' : '#f4f2f8' }}>{fmt(total)}</div>
                </div>
              </div>

              {couponApplied && (
                <div style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(52,211,153,.08)', border: '1px solid rgba(52,211,153,.18)', borderRadius: 10, padding: '10px 14px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  <span style={{ fontSize: 14, color: 'rgba(52,211,153,.85)' }}>você economizou <strong style={{ color: '#34d399' }}>{fmt(discountAmt)}</strong> nessa compra</span>
                </div>
              )}

              {payError && (
                <div style={{ marginTop: 20, background: 'rgba(248,113,113,.07)', border: '1px solid rgba(248,113,113,.18)', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#f87171' }}>
                  {payError}
                </div>
              )}
            </div>

            {/* Pay CTA */}
            <div style={{ padding: '14px 24px 20px', borderTop: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
              <button
                onClick={handlePay}
                disabled={loading}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  background: AC, color: '#ffffff', fontWeight: 800, fontSize: 15,
                  padding: '15px 0', border: 'none', borderRadius: 13,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: `0 10px 32px color-mix(in srgb,${AC} 44%,transparent)`,
                  fontFamily: "'Manrope',sans-serif", opacity: loading ? .7 : 1, transition: 'opacity .15s',
                }}
              >
                {loading ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'lumaSpin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-3.6-7.2"/></svg>
                    Gerando PIX...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>
                    Pagar {fmt(total)} via PIX
                  </>
                )}
              </button>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12, fontSize: 11.5, color: 'rgba(244,242,248,.28)' }}>
                <span>⚡ Ativação em 30s</span>
                <span>♾️ GB nunca expira</span>
                <span>🔒 Compra segura</span>
              </div>
            </div>
          </>
        )}

        {/* ── STEP 3: PIX ── */}
        {step === 'pix' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {pixStatus === 'completed' ? (
              /* ── Success ── */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, padding: '16px 0' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(52,211,153,.12)', border: '1.5px solid rgba(52,211,153,.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
                <div>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 20, color: '#34d399', marginBottom: 6 }}>Pagamento confirmado!</div>
                  <p style={{ fontSize: 14, color: 'rgba(244,242,248,.5)', margin: 0, lineHeight: 1.7 }}>
                    Você receberá as credenciais da sua proxy por email em breve.<br />
                    Pode fechar esta janela.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  style={{
                    marginTop: 8, background: AC, color: '#ffffff', fontWeight: 700, fontSize: 14,
                    padding: '12px 28px', border: 'none', borderRadius: 12, cursor: 'pointer',
                    boxShadow: `0 8px 24px color-mix(in srgb,${AC} 40%,transparent)`,
                    fontFamily: "'Manrope',sans-serif",
                  }}
                >
                  Fechar
                </button>
              </div>
            ) : pixStatus === 'failed' ? (
              /* ── Failed ── */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, padding: '16px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(248,113,113,.1)', border: '1.5px solid rgba(248,113,113,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </div>
                <div>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 18, color: '#f87171', marginBottom: 6 }}>Pagamento não identificado</div>
                  <p style={{ fontSize: 14, color: 'rgba(244,242,248,.5)', margin: 0, lineHeight: 1.7 }}>
                    Tente novamente ou entre em contato com o suporte.
                  </p>
                </div>
                <button
                  onClick={() => { setStep('summary'); setPayError(null) }}
                  style={{ marginTop: 4, background: 'rgba(255,255,255,.07)', color: '#f4f2f8', fontWeight: 600, fontSize: 14, padding: '11px 24px', border: '1px solid rgba(255,255,255,.1)', borderRadius: 11, cursor: 'pointer' }}
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              /* ── Pending ── */
              <>
                {/* Amount */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.14em', color: 'rgba(244,242,248,.3)', textTransform: 'uppercase', marginBottom: 6 }}>
                    Valor a pagar
                  </div>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 36, color: '#f4f2f8', lineHeight: 1 }}>
                    {fmt(total)}
                  </div>
                </div>

                {/* QR Code */}
                {pixCode && (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                      padding: 16, background: '#ffffff', borderRadius: 16,
                      boxShadow: `0 0 0 1px rgba(168,85,247,.2), 0 8px 32px rgba(0,0,0,.4)`,
                      display: 'inline-flex',
                    }}>
                      <QRCodeSVG value={pixCode} size={180} />
                    </div>
                  </div>
                )}

                {/* PIX copia e cola */}
                <div>
                  <div style={LABEL}>PIX copia e cola</div>
                  <div style={{
                    background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.1)',
                    borderRadius: 12, padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      flex: 1, fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                      color: 'rgba(244,242,248,.6)', wordBreak: 'break-all', lineHeight: 1.6,
                      maxHeight: 72, overflow: 'hidden',
                    }}>
                      {pixCode || '—'}
                    </div>
                    <button
                      onClick={handleCopyPix}
                      style={{
                        flexShrink: 0, background: copied ? 'rgba(52,211,153,.12)' : `color-mix(in srgb,${AC} 15%,transparent)`,
                        border: `1px solid ${copied ? 'rgba(52,211,153,.25)' : `color-mix(in srgb,${AC} 30%,transparent)`}`,
                        borderRadius: 10, padding: '9px 16px', cursor: 'pointer',
                        color: copied ? '#34d399' : AC2, fontWeight: 600, fontSize: 13,
                        fontFamily: "'Manrope',sans-serif", transition: 'all .15s',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      {copied ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          Copiado
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                          Copiar
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Awaiting status */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: `color-mix(in srgb,${AC} 6%,transparent)`,
                  border: `1px solid color-mix(in srgb,${AC} 20%,transparent)`,
                  borderRadius: 12, padding: '14px 16px',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" style={{ animation: 'lumaSpin 1.2s linear infinite', flexShrink: 0 }}><path d="M21 12a9 9 0 1 1-3.6-7.2"/></svg>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f4f2f8', marginBottom: 2 }}>Aguardando pagamento...</div>
                    <div style={{ fontSize: 12, color: 'rgba(244,242,248,.4)' }}>Após o PIX ser pago, você receberá confirmação por email.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: 12, color: 'rgba(244,242,248,.25)' }}>
                  <span>⚡ Confirmação automática</span>
                  <span>🔒 Pagamento seguro</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
