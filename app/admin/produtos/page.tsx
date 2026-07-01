'use client'

import { useState, useEffect } from 'react'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Check, Pencil, X } from 'lucide-react'

interface Product {
  id: string
  name: string
  gb_limit: number
  price: number
  cost_price: number | null
  active: boolean
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseBRL(s: string): number {
  return parseFloat(s.replace(/[^\d,]/g, '').replace(',', '.')) || 0
}

const AC = '#a855f7'

const CORRECT_PLANS: Array<{ gb: number; price: number; name: string }> = [
  { gb: 3,  price: 24.90,  name: 'Proxy Rotativa 3GB'  },
  { gb: 5,  price: 41.90,  name: 'Proxy Rotativa 5GB'  },
  { gb: 10, price: 79.90,  name: 'Proxy Rotativa 10GB' },
  { gb: 20, price: 157.90, name: 'Proxy Rotativa 20GB' },
]

export default function AdminProdutosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState<Record<string, { price: string; cost: string }>>({})
  const [saving, setSaving]     = useState<Record<string, boolean>>({})
  const [msg, setMsg]           = useState<Record<string, { text: string; ok: boolean }>>({})
  const [fixing, setFixing]     = useState(false)

  function load() {
    setLoading(true)
    fetch('/api/admin/products')
      .then(r => r.json())
      .then(d => setProducts(Array.isArray(d) ? d : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function startEdit(p: Product) {
    setEditing(e => ({
      ...e,
      [p.id]: {
        price: String(p.price).replace('.', ','),
        cost:  p.cost_price != null ? String(p.cost_price).replace('.', ',') : '',
      },
    }))
    setMsg(m => { const n = { ...m }; delete n[p.id]; return n })
  }

  function cancelEdit(id: string) {
    setEditing(e => { const n = { ...e }; delete n[id]; return n })
  }

  async function saveProduct(p: Product) {
    const ed = editing[p.id]
    if (!ed) return
    const newPrice = parseBRL(ed.price)
    const newCost  = ed.cost.trim() ? parseBRL(ed.cost) : null
    if (!newPrice || newPrice <= 0) {
      setMsg(m => ({ ...m, [p.id]: { text: 'Preço inválido.', ok: false } }))
      return
    }
    setSaving(s => ({ ...s, [p.id]: true }))
    try {
      const body: Record<string, unknown> = { price: newPrice }
      if (newCost !== null) body.cost_price = newCost
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setMsg(m => ({ ...m, [p.id]: { text: 'Salvo!', ok: true } }))
        cancelEdit(p.id)
        load()
        setTimeout(() => setMsg(m => { const n = { ...m }; delete n[p.id]; return n }), 2500)
      } else {
        setMsg(m => ({ ...m, [p.id]: { text: 'Erro ao salvar.', ok: false } }))
      }
    } catch {
      setMsg(m => ({ ...m, [p.id]: { text: 'Erro de conexão.', ok: false } }))
    } finally {
      setSaving(s => ({ ...s, [p.id]: false }))
    }
  }

  async function applyCorrectPrices() {
    if (!confirm('Sincronizar todos os 4 planos com os preços corretos? Produtos faltando (10GB / 20GB) serão criados.')) return
    setFixing(true)
    try {
      await Promise.all(
        CORRECT_PLANS.map(plan => {
          const existing = products.find(p => Number(p.gb_limit) === plan.gb)
          if (existing) {
            // atualiza preço do produto existente
            return fetch(`/api/admin/products/${existing.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ price: plan.price }),
            })
          } else {
            // cria produto novo
            return fetch('/api/admin/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name:       plan.name,
                gb_limit:   plan.gb,
                price:      plan.price,
                proxy_type: 'residential_rotating',
              }),
            })
          }
        })
      )

      load()
    } finally {
      setFixing(false)
    }
  }

  return (
    <DashboardShell isAdmin userName="Admin">
      <TopBar
        title="Produtos"
        sub="Gerencie preços dos planos"
        actions={
          <Button size="sm" variant="ghost" onClick={applyCorrectPrices} loading={fixing}>
            Aplicar preços padrão
          </Button>
        }
      />
      <div className="p-6">
        <Card padded={false}>
          {loading ? (
            <p className="text-center text-(--text-faint) text-sm py-10">Carregando...</p>
          ) : products.length === 0 ? (
            <p className="text-center text-(--text-faint) text-sm py-10">Nenhum produto encontrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--border)">
                  {['Produto', 'GB', 'Preço atual', 'Preço de custo', 'Status', 'Ações'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-(--text-faint) px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const isEditing = !!editing[p.id]
                  const ed = editing[p.id]
                  const isSaving = saving[p.id]
                  const m = msg[p.id]

                  return (
                    <tr key={p.id} className="border-b border-(--border) last:border-0">
                      {/* Nome */}
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-(--text)">{p.name}</div>
                      </td>

                      {/* GB */}
                      <td className="px-5 py-4">
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: AC }}>
                          {p.gb_limit} GB
                        </span>
                      </td>

                      {/* Preço */}
                      <td className="px-5 py-4">
                        {isEditing ? (
                          <input
                            value={ed.price}
                            onChange={e => setEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], price: e.target.value } }))}
                            style={{
                              width: 110, padding: '6px 10px', borderRadius: 8,
                              border: '1.5px solid rgba(168,85,247,.5)', background: 'rgba(168,85,247,.08)',
                              color: '#f4f2f8', fontFamily: "'JetBrains Mono',monospace", fontSize: 13, outline: 'none',
                            }}
                          />
                        ) : (
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: '#f4f2f8' }}>
                            {fmtBRL(p.price)}
                          </span>
                        )}
                      </td>

                      {/* Custo */}
                      <td className="px-5 py-4">
                        {isEditing ? (
                          <input
                            value={ed.cost}
                            onChange={e => setEditing(prev => ({ ...prev, [p.id]: { ...prev[p.id], cost: e.target.value } }))}
                            placeholder="ex: 5,00"
                            style={{
                              width: 110, padding: '6px 10px', borderRadius: 8,
                              border: '1.5px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)',
                              color: '#f4f2f8', fontFamily: "'JetBrains Mono',monospace", fontSize: 13, outline: 'none',
                            }}
                          />
                        ) : (
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'rgba(244,242,248,.4)' }}>
                            {p.cost_price != null ? fmtBRL(p.cost_price) : '—'}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, letterSpacing: '.04em',
                          background: p.active ? 'rgba(52,211,153,.12)' : 'rgba(248,113,113,.1)',
                          color: p.active ? '#34d399' : '#f87171',
                        }}>
                          {p.active ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="px-5 py-4">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {m && (
                            <span style={{ fontSize: 12, color: m.ok ? '#34d399' : '#f87171', fontWeight: 600 }}>
                              {m.text}
                            </span>
                          )}
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveProduct(p)}
                                disabled={isSaving}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8, border: `1px solid color-mix(in srgb,${AC} 40%,transparent)`, background: `color-mix(in srgb,${AC} 12%,transparent)`, color: AC, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? .6 : 1 }}
                              >
                                <Check size={13} />
                                {isSaving ? 'Salvando...' : 'Salvar'}
                              </button>
                              <button
                                onClick={() => cancelEdit(p.id)}
                                style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: 'rgba(244,242,248,.5)', cursor: 'pointer' }}
                              >
                                <X size={13} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEdit(p)}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: 'rgba(244,242,248,.6)', cursor: 'pointer' }}
                            >
                              <Pencil size={12} />
                              Editar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>

        <p style={{ fontSize: 12, color: 'rgba(244,242,248,.3)', marginTop: 16, textAlign: 'center' }}>
          Preços alterados aqui refletem automaticamente na landing page e no checkout.
        </p>
      </div>
    </DashboardShell>
  )
}
