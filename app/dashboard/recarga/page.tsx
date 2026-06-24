'use client'

import { useState } from 'react'

const AC  = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

const PACKS = [
  { g: '1 GB',  p: 'R$ 9,90'    },
  { g: '5 GB',  p: 'R$ 42,90'   },
  { g: '10 GB', p: 'R$ 79,90'   },
  { g: '50 GB', p: 'R$ 369,90'  },
]

export default function RecargaPage() {
  const [idx, setIdx] = useState(2)

  const pkBase: React.CSSProperties = { cursor: 'pointer', borderRadius: 14, padding: '18px 12px', textAlign: 'center', fontFamily: "'Manrope',sans-serif", width: '100%', background: 'none' }
  const pkOn: React.CSSProperties  = { ...pkBase, border: `1.5px solid ${AC}`, background: `linear-gradient(180deg,color-mix(in srgb,${AC} 16%,transparent),rgba(255,255,255,.01))`, boxShadow: `0 10px 30px color-mix(in srgb,${AC} 26%,transparent)` }
  const pkOff: React.CSSProperties = { ...pkBase, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)' }

  return (
    <div style={{ animation: 'lumaRise .4s ease both', maxWidth: 760 }}>
      <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 30, letterSpacing: '-.02em', margin: 0 }}>Recarregar proxy</h1>
      <p style={{ fontSize: 15, color: 'rgba(244,242,248,.55)', margin: '8px 0 0' }}>Adicione mais GB à sua proxy. Ativação instantânea via PIX.</p>

      {/* PROXY SELECIONADA */}
      <div style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 16, padding: 18, marginTop: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 12, background: `color-mix(in srgb,${AC} 16%,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: AC2 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/></svg>
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Residencial Rotativa Premium 10GB</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'rgba(244,242,248,.45)', marginTop: 3 }}>066c3250af29f6f10481</div>
        </div>
      </div>

      {/* QUANTIDADE */}
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.14em', color: 'rgba(244,242,248,.45)', textTransform: 'uppercase', margin: '24px 0 12px' }}>Selecione a quantidade</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {PACKS.map((pack, i) => (
          <button key={i} onClick={() => setIdx(i)} style={i === idx ? pkOn : pkOff}>
            <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 22, color: '#f4f2f8' }}>{pack.g}</div>
            <div style={{ fontSize: 13, color: AC2, fontWeight: 700, marginTop: 4 }}>{pack.p}</div>
          </button>
        ))}
      </div>

      {/* TOTAL + CTA */}
      <div style={{ border: `1px solid color-mix(in srgb,${AC} 24%,transparent)`, background: `linear-gradient(180deg,color-mix(in srgb,${AC} 10%,transparent),rgba(255,255,255,.01))`, borderRadius: 16, padding: 22, marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.14em', color: 'rgba(244,242,248,.45)', textTransform: 'uppercase' }}>Total · {PACKS[idx].g}</div>
          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 34, color: AC2, marginTop: 6 }}>{PACKS[idx].p}</div>
        </div>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 15, padding: '15px 26px', border: 'none', borderRadius: 13, cursor: 'pointer', boxShadow: `0 10px 30px color-mix(in srgb,${AC} 44%,transparent)`, fontFamily: "'Manrope',sans-serif" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>
          Recarregar via PIX
        </button>
      </div>

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
