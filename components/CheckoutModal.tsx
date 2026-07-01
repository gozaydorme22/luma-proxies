'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { User } from 'firebase/auth'
import { QRCodeSVG } from 'qrcode.react'

const AC  = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

interface Plan { gb: string; price: number; label: string; perGb: number }

// Preços base (antes do cupom LUMA30 −30%)
const FALLBACK_PLANS: Plan[] = [
  { gb: '3',  price: 29.90,  label: '3 GB',  perGb: 9.97  },
  { gb: '5',  price: 45.90,  label: '5 GB',  perGb: 9.18  },
  { gb: '10', price: 87.90,  label: '10 GB', perGb: 8.79  },
  { gb: '20', price: 173.90, label: '20 GB', perGb: 8.695 },
]

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtPerGb(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}/GB`
}

function validateCpf(d: string): boolean {
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  let s = 0
  for (let i = 0; i < 9; i++) s += +d[i] * (10 - i)
  let r = (s * 10) % 11; if (r === 10 || r === 11) r = 0
  if (r !== +d[9]) return false
  s = 0
  for (let i = 0; i < 10; i++) s += +d[i] * (11 - i)
  r = (s * 10) % 11; if (r === 10 || r === 11) r = 0
  return r === +d[10]
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
  const [plans, setPlans]   = useState<Plan[]>(FALLBACK_PLANS)
  const planIdx = FALLBACK_PLANS.findIndex(p => p.gb === initialPlan)
  const [idx, setIdx]       = useState(planIdx >= 0 ? planIdx : 1)
  const [method, setMethod] = useState<'pix' | 'crypto'>('pix')
  const [step, setStep]     = useState<'form' | 'summary' | 'pix'>('form')

  const [couponInput, setCouponInput]         = useState('')
  const [couponApplied, setCouponApplied]     = useState<string | null>(null)
  const [couponDiscountPct, setCouponDiscountPct] = useState(0)
  const [couponError, setCouponError]         = useState<string | null>(null)
  const [couponLoading, setCouponLoading]     = useState(false)
  const couponRef = useRef<HTMLInputElement>(null)

  const [whatsapp, setWhatsapp] = useState('')

  const [loading, setLoading]   = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  type ActiveProxy = { usedGb: number; totalGb: number; label: string; suspended?: boolean }
  const [activeProxy, setActiveProxy]       = useState<ActiveProxy | null | undefined>(undefined)
  const [purchaseIntent, setPurchaseIntent] = useState<'recharge' | 'new' | null>(null)

  // PIX state
  const [pixCode,   setPixCode]   = useState('')
  const [pixId,     setPixId]     = useState('')
  const [pixStatus, setPixStatus] = useState<'pending' | 'completed' | 'failed'>('pending')
  const [copied,    setCopied]    = useState(false)

  const plan        = plans[idx] ?? plans[0] ?? FALLBACK_PLANS[0]
  const discountAmt = couponApplied ? plan.price * couponDiscountPct : 0
  const total       = plan.price - discountAmt
  const loggedIn    = user !== undefined && user !== null

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Busca preços do banco; fallback mantém os preços corretos enquanto carrega
  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then((data: Array<{ gb_limit: number; price: number }>) => {
        if (!Array.isArray(data) || data.length < 2) return
        const mapped: Plan[] = data
          .sort((a, b) => a.gb_limit - b.gb_limit)
          .map(p => ({
            gb:    String(p.gb_limit),
            price: p.price,
            label: `${p.gb_limit} GB`,
            perGb: p.price / p.gb_limit,
          }))
        setPlans(mapped)
        // Re-seleciona o idx correto; se o plano inicial não existir, usa o primeiro disponível
        const newIdx = mapped.findIndex(p => p.gb === initialPlan)
        setIdx(newIdx >= 0 ? newIdx : 0)
      })
      .catch(() => { /* mantém fallback */ })
  }, [initialPlan])

  // Detect if user has an active or suspended proxy — determines recharge vs new proxy flow
  useEffect(() => {
    if (!user) return
    fetch('/api/proxies')
      .then(r => r.json())
      .then(d => {
        const activeP    = (d.proxies ?? []).find((p: { status: string }) => p.status === 'ativa')
        const suspendedP = !activeP ? (d.proxies ?? []).find((p: { status: string }) => p.status === 'suspensa') : null
        const proxy = activeP ?? suspendedP
        if (!proxy) {
          setActiveProxy(null)
          setPurchaseIntent('new')
        } else {
          setActiveProxy({ usedGb: proxy.usedGb, totalGb: proxy.totalGb, label: proxy.name, suspended: proxy.status === 'suspensa' })
          if (proxy.status === 'suspensa' || proxy.usedGb >= proxy.totalGb) {
            setPurchaseIntent('recharge') // suspended or GB exhausted → auto-recharge
          }
          // else: user must choose
        }
      })
      .catch(() => { setActiveProxy(null); setPurchaseIntent('new') })
  }, [user])

  // No auto-coupon — user types the code manually

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
    setCouponApplied(null); setCouponDiscountPct(0); setCouponInput(''); setCouponError(null)
  }

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase()
    setCouponError(null)
    if (!code) return
    setCouponLoading(true)
    try {
      const r = await fetch(`/api/coupon/status?code=${encodeURIComponent(code)}`)
      const d = await r.json() as { valid: boolean; discount_pct?: number; error?: string }
      if (!d.valid) { setCouponError(d.error ?? 'Cupom inválido.'); return }
      setCouponApplied(code)
      setCouponDiscountPct(d.discount_pct ?? 0)
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
          gb:          Number(plan.gb),
          whatsapp:    whatsapp.trim() || null,
          coupon:      couponApplied,
          is_recharge: purchaseIntent === 'recharge',
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

              {/* Intent chooser — shown when user has active proxy with remaining GB */}
              {loggedIn && activeProxy !== undefined && activeProxy !== null && (
                <>
                  {purchaseIntent === null ? (
                    <div>
                      <div style={LABEL}>O que você quer fazer?</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                          { key: 'recharge' as const, title: 'Recarregar proxy atual', sub: `Adiciona GB na "${activeProxy.label}" — mesmas credenciais` },
                          { key: 'new'      as const, title: 'Nova proxy',             sub: 'Novas credenciais separadas (para outro projeto)' },
                        ].map(opt => (
                          <button
                            key={opt.key}
                            onClick={() => setPurchaseIntent(opt.key)}
                            style={{
                              background: 'rgba(255,255,255,.03)',
                              border: '1px solid rgba(255,255,255,.1)',
                              borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                              textAlign: 'left', transition: 'all .12s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `color-mix(in srgb,${AC} 50%,transparent)`; (e.currentTarget as HTMLButtonElement).style.background = `color-mix(in srgb,${AC} 7%,transparent)` }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,.1)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.03)' }}
                          >
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#f4f2f8' }}>{opt.title}</div>
                            <div style={{ fontSize: 12, color: 'rgba(244,242,248,.45)', marginTop: 4 }}>{opt.sub}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : activeProxy.usedGb >= activeProxy.totalGb || activeProxy.suspended ? (
                    /* Proxy suspensa ou GB esgotado — sempre recarga, sem escolha */
                    <div style={{ background: `color-mix(in srgb,${AC} 7%,transparent)`, border: `1px solid color-mix(in srgb,${AC} 25%,transparent)`, borderRadius: 12, padding: '12px 16px', fontSize: 13.5, color: 'rgba(244,242,248,.75)' }}>
                      {activeProxy.suspended
                        ? <><b style={{ color: AC2 }}>Proxy suspensa</b> (GB esgotado). Você está recarregando — as mesmas credenciais serão restauradas.</>
                        : <><b style={{ color: AC2 }}>GB esgotado.</b> Sua proxy atual será recarregada com os novos GB.</>
                      }
                    </div>
                  ) : (
                    /* Mostrar escolha feita + link para alterar */
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '11px 16px' }}>
                      <span style={{ fontSize: 13.5, color: 'rgba(244,242,248,.7)', fontWeight: 600 }}>
                        {purchaseIntent === 'recharge' ? '⚡ Recarregar proxy atual' : '➕ Nova proxy'}
                      </span>
                      <button onClick={() => setPurchaseIntent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: AC2, fontSize: 12.5, fontWeight: 600, padding: 0 }}>
                        Alterar
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Plan selector */}
              <div>
                <div style={LABEL}>Selecione o plano</div>
                <div className="checkout-plan-grid">
                  {plans.map((p, i) => {
                    const active     = i === idx
                    const hasDisc    = !!couponApplied
                    const finalPrice = hasDisc ? p.price * (1 - couponDiscountPct) : p.price
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
                          {hasDisc ? fmtPerGb(finalPrice / Number(p.gb)) : fmtPerGb(p.perGb ?? p.price / Number(p.gb))}
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
                        <span style={{ color: 'rgba(244,242,248,.45)' }}> · {Math.round(couponDiscountPct * 100)}% de desconto</span>
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
                      {!couponInput && !couponError && (
                        <div
                          onClick={() => { setCouponInput('LUMA30'); couponRef.current?.focus() }}
                          style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(244,242,248,.4)', cursor: 'pointer', transition: 'color .15s' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(244,242,248,.7)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(244,242,248,.4)')}
                        >
                          🎁 <span>Tem um cupom? Use <b style={{ fontFamily: "'JetBrains Mono',monospace", color: '#c084fc' }}>LUMA30</b> para 30% off</span>
                        </div>
                      )}
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

              {/* Contato — WhatsApp */}
              {loggedIn && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(244,242,248,.4)', fontFamily: "'JetBrains Mono',monospace" }}>Telefone (opcional)</label>
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
                {(() => {
                  const intentPending = loggedIn && activeProxy !== undefined && activeProxy !== null && purchaseIntent === null
                  const canGo = !intentPending
                  return (
                    <>
                      <button
                        onClick={() => { if (canGo) setStep('summary') }}
                        disabled={!canGo}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                          background: canGo ? AC : 'rgba(255,255,255,.06)',
                          color: canGo ? '#ffffff' : 'rgba(244,242,248,.25)',
                          fontWeight: 800, fontSize: 15,
                          padding: '15px 0', border: 'none', borderRadius: 13,
                          cursor: canGo ? 'pointer' : 'not-allowed',
                          boxShadow: canGo ? `0 10px 32px color-mix(in srgb,${AC} 44%,transparent)` : 'none',
                          fontFamily: "'Manrope',sans-serif",
                          transition: 'all .15s',
                        }}
                      >
                        Continuar
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                      </button>
                      {intentPending && (
                        <div style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: 'rgba(244,242,248,.4)' }}>
                          Escolha entre recarregar ou criar uma nova proxy.
                        </div>
                      )}
                    </>
                  )
                })()}
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
                      desconto {Math.round(couponDiscountPct * 100)}%
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
                    Suas credenciais serão enviadas por email em instantes.<br />
                    Acesse o dashboard para acompanhar sua proxy.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
                  <Link
                    href="/dashboard"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      background: AC, color: '#ffffff', fontWeight: 700, fontSize: 14,
                      padding: '13px 28px', borderRadius: 12, textDecoration: 'none',
                      boxShadow: `0 8px 24px color-mix(in srgb,${AC} 40%,transparent)`,
                      fontFamily: "'Manrope',sans-serif",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                    Ir para o dashboard
                  </Link>
                  <button
                    onClick={onClose}
                    style={{
                      background: 'rgba(255,255,255,.06)', color: 'rgba(244,242,248,.5)', fontWeight: 600, fontSize: 13,
                      padding: '11px 28px', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, cursor: 'pointer',
                      fontFamily: "'Manrope',sans-serif",
                    }}
                  >
                    Fechar
                  </button>
                </div>
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
