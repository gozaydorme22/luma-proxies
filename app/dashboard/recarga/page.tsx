'use client'

import { useState, useEffect } from 'react'

const AC  = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

const COUPON_CODE    = 'LUMA10'
const COUPON_PERCENT = 0.10

const PACKS = [
  { g: '1 GB',  p: 'R$ 6,50',   raw: 6.50   },
  { g: '3 GB',  p: 'R$ 18,90',  raw: 18.90  },
  { g: '5 GB',  p: 'R$ 31,90',  raw: 31.90  },
  { g: '10 GB', p: 'R$ 60,90',  raw: 60.90  },
  { g: '20 GB', p: 'R$ 120,90', raw: 120.90 },
]

function fmtBrl(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function RecargaPage() {
  const [idx, setIdx]                   = useState(2)
  const [couponEligible, setCouponEligible] = useState<boolean | null>(null)
  const [applying, setApplying]         = useState(false)
  const [doneMsg, setDoneMsg]           = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/coupon/status')
      .then(r => r.json())
      .then(d => setCouponEligible(d.eligible))
      .catch(() => setCouponEligible(false))
  }, [])

  const pack    = PACKS[idx]
  const discount = couponEligible ? pack.raw * COUPON_PERCENT : 0
  const total   = pack.raw - discount

  async function handlePay() {
    setApplying(true)
    try {
      if (couponEligible) {
        const res = await fetch('/api/coupon/use', { method: 'POST' })
        if (!res.ok) {
          const d = await res.json()
          setDoneMsg(d.error ?? 'Erro ao aplicar cupom.')
          setApplying(false)
          return
        }
        setCouponEligible(false)
      }
      // TODO: iniciar cobrança PIX aqui
      setDoneMsg('PIX gerado! (integração pendente)')
    } finally {
      setApplying(false)
    }
  }

  const pkBase: React.CSSProperties = {
    cursor: 'pointer', borderRadius: 14, padding: '18px 12px', textAlign: 'center',
    fontFamily: "'Manrope',sans-serif", width: '100%', background: 'none', position: 'relative',
  }
  const pkOn: React.CSSProperties  = { ...pkBase, border: `1.5px solid ${AC}`, background: `linear-gradient(180deg,color-mix(in srgb,${AC} 16%,transparent),rgba(255,255,255,.01))`, boxShadow: `0 10px 30px color-mix(in srgb,${AC} 26%,transparent)` }
  const pkOff: React.CSSProperties = { ...pkBase, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)' }

  return (
    <div style={{ animation: 'lumaRise .4s ease both', maxWidth: 760 }}>
      <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 30, letterSpacing: '-.02em', margin: 0 }}>Recarregar proxy</h1>
      <p style={{ fontSize: 15, color: 'rgba(244,242,248,.55)', margin: '8px 0 0' }}>Adicione mais GB à sua proxy. Ativação instantânea via PIX.</p>

      {/* CUPOM BANNER */}
      {couponEligible && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(52,211,153,.25)', background: 'rgba(52,211,153,.07)', borderRadius: 13, padding: '13px 16px', marginTop: 18 }}>
          <span style={{ fontSize: 18 }}>🎁</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f4f2f8' }}>Cupom de primeira compra aplicado: </span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 800, color: '#34d399', letterSpacing: '.08em' }}>{COUPON_CODE}</span>
            <span style={{ fontSize: 13.5, color: 'rgba(244,242,248,.6)' }}> — 10% off nesta compra</span>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(52,211,153,.15)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 7, padding: '5px 10px', fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 700, color: '#34d399', letterSpacing: '.06em', flexShrink: 0 }}>
            ✓ ATIVO
          </span>
        </div>
      )}

      {/* PROXY SELECIONADA */}
      <div style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 16, padding: 18, marginTop: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, background: `color-mix(in srgb,${AC} 16%,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: AC2 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/></svg>
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Residencial Rotativa Premium</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'rgba(244,242,248,.45)', marginTop: 3 }}>066c3250af29f6f10481</div>
        </div>
      </div>

      {/* QUANTIDADE */}
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.14em', color: 'rgba(244,242,248,.45)', textTransform: 'uppercase', margin: '24px 0 12px' }}>Selecione a quantidade</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
        {PACKS.map((pack, i) => {
          const discPrice = couponEligible ? pack.raw * (1 - COUPON_PERCENT) : null
          return (
            <button key={i} onClick={() => setIdx(i)} style={i === idx ? pkOn : pkOff}>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 20, color: '#f4f2f8' }}>{pack.g}</div>
              {discPrice !== null ? (
                <>
                  <div style={{ fontSize: 11, color: 'rgba(244,242,248,.35)', textDecoration: 'line-through', marginTop: 5 }}>{pack.p}</div>
                  <div style={{ fontSize: 13, color: '#34d399', fontWeight: 800, marginTop: 2 }}>{fmtBrl(discPrice)}</div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: AC2, fontWeight: 700, marginTop: 5 }}>{pack.p}</div>
              )}
            </button>
          )
        })}
      </div>

      {/* TOTAL + CTA */}
      <div style={{ border: `1px solid color-mix(in srgb,${AC} 24%,transparent)`, background: `linear-gradient(180deg,color-mix(in srgb,${AC} 10%,transparent),rgba(255,255,255,.01))`, borderRadius: 16, padding: 22, marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.14em', color: 'rgba(244,242,248,.45)', textTransform: 'uppercase' }}>Total · {pack.g}</div>
          {couponEligible && (
            <div style={{ fontSize: 13, color: 'rgba(244,242,248,.4)', textDecoration: 'line-through', marginTop: 4 }}>{pack.p}</div>
          )}
          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 34, color: couponEligible ? '#34d399' : AC2, marginTop: couponEligible ? 2 : 6 }}>{fmtBrl(total)}</div>
          {couponEligible && (
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: '#34d399', marginTop: 2, letterSpacing: '.06em' }}>− {fmtBrl(discount)} com {COUPON_CODE}</div>
          )}
        </div>
        <button
          onClick={handlePay}
          disabled={applying}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 15, padding: '15px 26px', border: 'none', borderRadius: 13, cursor: applying ? 'not-allowed' : 'pointer', boxShadow: `0 10px 30px color-mix(in srgb,${AC} 44%,transparent)`, fontFamily: "'Manrope',sans-serif", opacity: applying ? .7 : 1 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>
          {applying ? 'Processando...' : 'Recarregar via PIX'}
        </button>
      </div>

      {doneMsg && (
        <div style={{ marginTop: 12, padding: '12px 16px', borderRadius: 11, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', fontSize: 13.5, color: 'rgba(244,242,248,.7)' }}>
          {doneMsg}
        </div>
      )}

      {/* INFO */}
      <div style={{ marginTop: 20, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.015)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { icon: '⚡', text: 'Ativação imediata após confirmação do PIX' },
          { icon: '♾️', text: 'GB nunca expiram — use no seu ritmo' },
          { icon: '🔒', text: 'Pagamento 100% seguro via Pix do Banco Central' },
        ].map(item => (
          <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13.5, color: 'rgba(244,242,248,.65)' }}>
            <span>{item.icon}</span>{item.text}
          </div>
        ))}
      </div>
    </div>
  )
}
