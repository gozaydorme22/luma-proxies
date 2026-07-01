'use client'

import { useState, useEffect } from 'react'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Trash2, ToggleLeft, ToggleRight, Plus } from 'lucide-react'

interface Coupon {
  id: string
  code: string
  discount_pct: number
  max_uses: number | null
  uses_count: number
  active: boolean
  expires_at: string | null
  created_at: string
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

const AC  = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

export default function CuponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [code,       setCode]       = useState('')
  const [discountPct,setDiscountPct]= useState('')
  const [maxUses,    setMaxUses]    = useState('')
  const [expiresAt,  setExpiresAt]  = useState('')

  useEffect(() => {
    fetch('/api/admin/coupons')
      .then(r => r.json())
      .then(d => setCoupons(Array.isArray(d) ? d : []))
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false))
  }, [])

  async function createCoupon() {
    if (!code || !discountPct) { setError('Código e desconto são obrigatórios.'); return }
    const pct = parseFloat(discountPct) / 100
    if (isNaN(pct) || pct <= 0 || pct >= 1) { setError('Desconto deve ser entre 1 e 99%.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, discount_pct: pct, max_uses: maxUses || null, expires_at: expiresAt || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao criar cupom.'); return }
      setCoupons(prev => [data, ...prev])
      setCode(''); setDiscountPct(''); setMaxUses(''); setExpiresAt('')
    } catch {
      setError('Erro de rede.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(c: Coupon) {
    const res = await fetch(`/api/admin/coupons/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !c.active }),
    })
    if (res.ok) {
      const updated = await res.json()
      setCoupons(prev => prev.map(x => x.id === c.id ? updated : x))
    }
  }

  async function deleteCoupon(c: Coupon) {
    if (!confirm(`Excluir o cupom ${c.code}?`)) return
    const res = await fetch(`/api/admin/coupons/${c.id}`, { method: 'DELETE' })
    if (res.ok) setCoupons(prev => prev.filter(x => x.id !== c.id))
  }

  const inp: React.CSSProperties = {
    background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 10, padding: '10px 14px', color: '#f4f2f8', fontSize: 13,
    fontFamily: "'JetBrains Mono',monospace", outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  return (
    <DashboardShell isAdmin userName="Admin">
      <TopBar title="Cupons" sub={loading ? 'Carregando...' : `${coupons.length} cupons cadastrados`} />
      <div className="p-6 flex flex-col gap-6">

        {/* CREATE FORM */}
        <Card padded>
          <div style={{ marginBottom: 16, fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 15, color: '#f4f2f8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} color={AC} /> Novo cupom
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'JetBrains Mono',monospace" }}>Código</div>
              <input
                style={inp} value={code} placeholder="ex: PROMO20"
                onChange={e => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'JetBrains Mono',monospace" }}>Desconto (%)</div>
              <input
                style={inp} value={discountPct} placeholder="ex: 10"
                type="number" min="1" max="99" step="1"
                onChange={e => setDiscountPct(e.target.value)}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'JetBrains Mono',monospace" }}>Máx. usos (vazio = ilimitado)</div>
              <input
                style={inp} value={maxUses} placeholder="ex: 50"
                type="number" min="1"
                onChange={e => setMaxUses(e.target.value)}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'JetBrains Mono',monospace" }}>Expira em (vazio = nunca)</div>
              <input
                style={inp} value={expiresAt} type="date"
                onChange={e => setExpiresAt(e.target.value ? new Date(e.target.value).toISOString() : '')}
              />
            </div>
          </div>
          {error && <div style={{ marginBottom: 10, fontSize: 13, color: '#f87171' }}>{error}</div>}
          <button
            onClick={createCoupon}
            disabled={saving}
            style={{ background: AC, color: '#0a0612', fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 13, padding: '10px 20px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .6 : 1 }}
          >
            {saving ? 'Criando...' : 'Criar cupom'}
          </button>
        </Card>

        {/* COUPONS LIST */}
        <Card padded={false}>
          {/* header */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 80px 120px 80px 130px 80px', gap: 8, padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            {['Código', 'Desconto', 'Usos', 'Máx.', 'Expira', ''].map((h, i) => (
              <div key={i} style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', color: 'rgba(244,242,248,.3)' }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(244,242,248,.3)', fontSize: 13 }}>Carregando...</p>
          ) : coupons.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(244,242,248,.3)', fontSize: 13 }}>Nenhum cupom cadastrado.</p>
          ) : coupons.map((c, idx) => (
            <div
              key={c.id}
              style={{ display: 'grid', gridTemplateColumns: '140px 80px 120px 80px 130px 80px', gap: 8, alignItems: 'center', padding: '13px 20px', borderBottom: idx < coupons.length - 1 ? '1px solid rgba(255,255,255,.06)' : 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13, color: c.active ? AC2 : 'rgba(244,242,248,.3)' }}>{c.code}</span>
                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: c.active ? 'rgba(52,211,153,.12)' : 'rgba(255,255,255,.06)', color: c.active ? '#34d399' : 'rgba(244,242,248,.3)', fontWeight: 700, letterSpacing: '.06em' }}>
                  {c.active ? 'ATIVO' : 'INATIVO'}
                </span>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 600, fontSize: 13, color: '#34d399' }}>
                {Math.round(Number(c.discount_pct) * 100)}%
              </div>
              <div>
                <div style={{ fontSize: 13, color: '#f4f2f8' }}>{c.uses_count} usos</div>
                {c.max_uses && (
                  <div style={{ fontSize: 11, color: 'rgba(244,242,248,.35)', marginTop: 2 }}>
                    {Math.max(0, c.max_uses - c.uses_count)} restantes
                  </div>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(244,242,248,.5)' }}>
                {c.max_uses ?? '∞'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(244,242,248,.5)' }}>
                {c.expires_at ? fmtDate(c.expires_at) : 'Nunca'}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => toggleActive(c)}
                  title={c.active ? 'Desativar' : 'Ativar'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.active ? '#34d399' : 'rgba(244,242,248,.3)', padding: 4 }}
                >
                  {c.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
                <button
                  onClick={() => deleteCoupon(c)}
                  title="Excluir"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(248,113,113,.6)', padding: 4 }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </Card>

      </div>
    </DashboardShell>
  )
}
