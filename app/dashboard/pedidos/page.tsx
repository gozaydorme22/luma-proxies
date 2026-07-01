'use client'

import { useState, useEffect } from 'react'

const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'
const AC  = '#a855f7'

interface Order {
  id: string; productName: string; productType: string
  unit: string; quantity: number; totalBrl: number
  status: string; orderType: 'recarga' | 'nova_proxy' | null; paidAt: string | null; createdAt: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusBadge(status: string): [string, string, string] {
  const map: Record<string, [string, string, string]> = {
    pago:                ['rgba(52,211,153,.16)',  '#34d399', 'PAGO'],
    aguardando_pagamento:['rgba(251,191,36,.16)',  '#fbbf24', 'PENDENTE'],
    cancelado:           ['rgba(248,113,113,.16)', '#f87171', 'CANCELADO'],
    reembolsado:         ['rgba(255,255,255,.08)', 'rgba(244,242,248,.5)', 'REEMBOLSADO'],
  }
  return map[status] ?? ['rgba(251,191,36,.16)', '#fbbf24', 'PENDENTE']
}

export default function PedidosPage() {
  const [orders, setOrders]   = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pedidos')
      .then(r => r.json())
      .then(d => setOrders(d.orders ?? []))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ animation: 'lumaRise .4s ease both' }}>
      <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 22, letterSpacing: '-.01em', margin: 0 }}>Pedidos</h1>
      <p style={{ fontSize: 13, color: 'rgba(244,242,248,.45)', margin: '5px 0 0' }}>Histórico de recargas e novas proxies da sua conta.</p>

      {loading ? (
        <div style={{ marginTop: 30, color: 'rgba(244,242,248,.3)', fontSize: 14 }}>Carregando pedidos...</div>
      ) : orders.length === 0 ? (
        <div style={{ marginTop: 30, padding: '50px 0', textAlign: 'center', border: '1px dashed rgba(255,255,255,.08)', borderRadius: 16, color: 'rgba(244,242,248,.3)', fontSize: 14 }}>
          Nenhum pedido encontrado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          {orders.map(o => {
            const [badgeBg, badgeFg, badgeText] = statusBadge(o.status)
            const vol = o.unit === 'gb' ? `${o.quantity} GB` : `${o.quantity} un`
            return (
              <div key={o.id} style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'rgba(244,242,248,.45)' }}>
                  <span># {o.id.slice(0, 8).toUpperCase()} · {fmtDate(o.createdAt)}</span>
                  <span style={{ background: badgeBg, color: badgeFg, padding: '4px 10px', borderRadius: 7, letterSpacing: '.06em' }}>{badgeText}</span>
                </div>
                <div className="order-item-grid">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, background: `color-mix(in srgb,${AC} 14%,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: AC2 }}>
                      {o.orderType === 'recarga'
                        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/></svg>
                      }
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontWeight: 500, fontSize: 13.5 }}>{o.productName}</span>
                        {o.orderType && (
                          <span style={{
                            fontSize: 10, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.07em',
                            fontWeight: 600, padding: '2px 7px', borderRadius: 6,
                            background: o.orderType === 'recarga' ? `color-mix(in srgb,${AC} 16%,transparent)` : 'rgba(52,211,153,.12)',
                            color: o.orderType === 'recarga' ? AC2 : '#34d399',
                            border: `1px solid ${o.orderType === 'recarga' ? `color-mix(in srgb,${AC} 28%,transparent)` : 'rgba(52,211,153,.22)'}`,
                          }}>
                            {o.orderType === 'recarga' ? 'RECARGA' : 'NOVA PROXY'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(244,242,248,.45)', textTransform: 'capitalize' }}>{o.productType.replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.13em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase' }}>Volume</div>
                    <div style={{ fontWeight: 500, fontSize: 13.5, marginTop: 3 }}>{vol}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.13em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase' }}>Total</div>
                    <div style={{ fontWeight: 500, fontSize: 13.5, marginTop: 3, color: AC2 }}>
                      R$ {o.totalBrl.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
