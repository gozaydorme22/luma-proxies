'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const AC  = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

const PLANS: Record<string, { gb: string; price: number; label: string }> = {
  '1':  { gb: '1',  price: 6.50,   label: '1 GB'  },
  '3':  { gb: '3',  price: 18.90,  label: '3 GB'  },
  '5':  { gb: '5',  price: 31.90,  label: '5 GB'  },
  '10': { gb: '10', price: 60.90,  label: '10 GB' },
  '20': { gb: '20', price: 120.90, label: '20 GB' },
}

const COUPON_PERCENT = 0.10

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function CheckoutInner() {
  const params  = useSearchParams()
  const router  = useRouter()
  const planKey = params.get('plan') ?? '5'
  const plan    = PLANS[planKey] ?? PLANS['5']

  const [couponEligible, setCouponEligible] = useState<boolean | null>(null)
  const [payMethod, setPayMethod]           = useState<'pix' | 'crypto'>('pix')
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/coupon/status')
      .then(r => r.json())
      .then(d => setCouponEligible(d.eligible))
      .catch(() => setCouponEligible(false))
  }, [])

  const discount = couponEligible ? plan.price * COUPON_PERCENT : 0
  const total    = plan.price - discount

  async function handlePay() {
    setError(null)
    setLoading(true)
    try {
      if (couponEligible) {
        const res = await fetch('/api/coupon/use', { method: 'POST' })
        if (!res.ok) {
          const d = await res.json()
          setError(d.error ?? 'Erro ao aplicar cupom.')
          return
        }
        setCouponEligible(false)
      }
      // TODO: gerar cobrança PIX/cripto e redirecionar para página de pagamento
      router.push('/dashboard/pedidos')
    } finally {
      setLoading(false)
    }
  }

  const methods: { key: 'pix' | 'crypto'; icon: React.ReactNode; label: string; sub: string }[] = [
    {
      key: 'pix',
      label: 'PIX',
      sub: 'Ativação em até 30 segundos',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/>
        </svg>
      ),
    },
    {
      key: 'crypto',
      label: 'Criptomoeda',
      sub: 'BTC · ETH · USDT',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#08070c', color: '#f4f2f8', fontFamily: "'Manrope',sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      {/* ambient glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 900, height: 600, background: `radial-gradient(ellipse at center, color-mix(in srgb,${AC} 18%,transparent), transparent 65%)`, filter: 'blur(20px)' }} />
      </div>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid rgba(255,255,255,.07)', background: 'rgba(8,7,12,.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <svg width="26" height="26" viewBox="0 0 34 34" fill="none">
              <circle cx="17" cy="17" r="14.5" stroke={AC} strokeWidth="2" opacity=".35"/>
              <path d="M17 2.5a14.5 14.5 0 0 1 0 29" stroke={AC2} strokeWidth="2.6" strokeLinecap="round"/>
              <circle cx="17" cy="17" r="4.6" fill={AC}/>
            </svg>
            <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 17, color: '#f4f2f8', letterSpacing: '-.02em' }}>LUMA<span style={{ color: AC2 }}> PROXIES</span></span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 13, color: 'rgba(244,242,248,.5)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Pagamento 100% seguro
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Criptografado
            </span>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '52px 24px 80px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32, alignItems: 'start', position: 'relative', zIndex: 2 }}>

        {/* LEFT COLUMN */}
        <div>
          {/* Step label */}
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.18em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase', marginBottom: 8 }}>Finalizar compra</div>
          <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 32, letterSpacing: '-.025em', margin: '0 0 6px' }}>Proxy Residencial <span style={{ color: AC }}>Rotativa</span></h1>
          <p style={{ fontSize: 14.5, color: 'rgba(244,242,248,.5)', margin: '0 0 36px' }}>Ativação instantânea · GB nunca expira · HTTP & SOCKS5</p>

          {/* Coupon badge */}
          {couponEligible && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(52,211,153,.22)', background: 'rgba(52,211,153,.06)', borderRadius: 13, padding: '13px 16px', marginBottom: 28 }}>
              <span style={{ fontSize: 18 }}>🎁</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#f4f2f8' }}>Cupom de primeira compra · </span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, color: '#34d399', letterSpacing: '.08em' }}>LUMA10</span>
                <span style={{ fontSize: 13.5, color: 'rgba(244,242,248,.55)' }}> — 10% de desconto aplicado</span>
              </div>
              <span style={{ background: 'rgba(52,211,153,.15)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 7, padding: '4px 10px', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, color: '#34d399', letterSpacing: '.06em', flexShrink: 0 }}>
                ✓ ATIVO
              </span>
            </div>
          )}

          {/* Payment method */}
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.16em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase', marginBottom: 14 }}>Método de pagamento</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
            {methods.map(m => (
              <button
                key={m.key}
                onClick={() => setPayMethod(m.key)}
                style={{
                  border: payMethod === m.key ? `1.5px solid ${AC}` : '1px solid rgba(255,255,255,.09)',
                  background: payMethod === m.key ? `linear-gradient(180deg,color-mix(in srgb,${AC} 14%,transparent),rgba(255,255,255,.01))` : 'rgba(255,255,255,.02)',
                  borderRadius: 14, padding: '16px 18px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 14,
                  boxShadow: payMethod === m.key ? `0 8px 28px color-mix(in srgb,${AC} 22%,transparent)` : 'none',
                  transition: 'all .15s',
                }}
              >
                <span style={{ color: payMethod === m.key ? AC2 : 'rgba(244,242,248,.45)' }}>{m.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: '#f4f2f8' }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: 'rgba(244,242,248,.45)', marginTop: 2 }}>{m.sub}</div>
                </div>
                {payMethod === m.key && (
                  <span style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%', background: AC, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0a0612" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Features */}
          <div style={{ border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.018)', borderRadius: 16, padding: '20px 22px' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.15em', color: 'rgba(244,242,248,.35)', textTransform: 'uppercase', marginBottom: 16 }}>O que você recebe</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                `${plan.label} de tráfego residencial rotativo`,
                'IPs residenciais reais — não datacenter',
                'Rotação automática por requisição ou intervalo',
                'HTTP e SOCKS5 · compatível com qualquer bot',
                'Painel de controle + monitoramento em tempo real',
                'Suporte humano 24/7 em português',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'rgba(244,242,248,.75)' }}>
                  <span style={{ width: 20, height: 20, flexShrink: 0, borderRadius: '50%', background: `color-mix(in srgb,${AC} 20%,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — ORDER SUMMARY */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div style={{ border: `1px solid color-mix(in srgb,${AC} 22%,transparent)`, background: `linear-gradient(180deg, color-mix(in srgb,${AC} 10%,transparent), rgba(255,255,255,.01))`, borderRadius: 20, padding: 26, boxShadow: `0 24px 64px color-mix(in srgb,${AC} 18%,transparent)` }}>

            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '.18em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase', marginBottom: 18 }}>Resumo do pedido</div>

            {/* Plan badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', borderRadius: 13, padding: '14px 16px', marginBottom: 22 }}>
              <div>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 20 }}>{plan.label}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(244,242,248,.4)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 4 }}>Res · Rotativa</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: `color-mix(in srgb,${AC} 14%,transparent)`, border: `1px solid color-mix(in srgb,${AC} 28%,transparent)`, borderRadius: 8, padding: '4px 10px', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: AC2, fontWeight: 700 }}>
                ∞ nunca expira
              </div>
            </div>

            {/* Line items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 18, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(244,242,248,.65)' }}>
                <span>Proxy Residencial {plan.label}</span>
                <span>{fmt(plan.price)}</span>
              </div>
              {couponEligible && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, background: 'rgba(52,211,153,.12)', border: '1px solid rgba(52,211,153,.2)', borderRadius: 5, padding: '2px 6px', fontWeight: 700 }}>LUMA10</span>
                    Desconto 10%
                  </span>
                  <span>− {fmt(discount)}</span>
                </div>
              )}
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,.08)', marginBottom: 16 }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 22 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.14em', color: 'rgba(244,242,248,.45)', textTransform: 'uppercase' }}>Total</span>
              <div style={{ textAlign: 'right' }}>
                {couponEligible && <div style={{ fontSize: 12, color: 'rgba(244,242,248,.35)', textDecoration: 'line-through', marginBottom: 2 }}>{fmt(plan.price)}</div>}
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 30, color: couponEligible ? '#34d399' : '#fff' }}>{fmt(total)}</div>
              </div>
            </div>

            {error && (
              <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 10, fontSize: 13, color: '#f87171' }}>
                {error}
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={loading}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                background: AC, color: '#0a0612', fontWeight: 800, fontSize: 15.5,
                padding: '16px 0', border: 'none', borderRadius: 14, cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: `0 12px 36px color-mix(in srgb,${AC} 48%,transparent)`,
                fontFamily: "'Manrope',sans-serif", opacity: loading ? .7 : 1, transition: 'opacity .15s',
              }}
            >
              {loading ? (
                'Processando...'
              ) : payMethod === 'pix' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>
                  Pagar via PIX
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727"/></svg>
                  Pagar com Crypto
                </>
              )}
            </button>

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: '⚡', text: 'Ativação em até 30 segundos' },
                { icon: '♾️', text: 'GB nunca expiram — sem prazo' },
                { icon: '🔒', text: 'Compra 100% segura e criptografada' },
              ].map(item => (
                <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'rgba(244,242,248,.45)' }}>
                  <span>{item.icon}</span>{item.text}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.06)', textAlign: 'center', fontSize: 12, color: 'rgba(244,242,248,.3)' }}>
              Ao pagar você concorda com os{' '}
              <a href="#" style={{ color: `color-mix(in srgb,${AC} 65%,rgba(244,242,248,.3))`, textDecoration: 'none' }}>Termos de Serviço</a>
            </div>
          </div>

          {/* Change plan link */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Link href="/#planos" style={{ fontSize: 13, color: 'rgba(244,242,248,.4)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Trocar de plano
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutInner />
    </Suspense>
  )
}
