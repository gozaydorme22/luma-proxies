'use client'

import { useState, useEffect } from 'react'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Badge, statusVariant } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Search, Trash2, Check, Minus } from 'lucide-react'

interface Order {
  id: string
  clientName: string
  clientEmail: string
  quantity: number
  totalBrl: number
  status: string
  paymentMethod: string
  paidAt: string | null
  createdAt: string
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pago: 'Pago', aguardando_pagamento: 'Pendente',
    cancelado: 'Cancelado', reembolsado: 'Reembolsado',
  }
  return map[s] ?? s
}

const AC = '#a855f7'

function Checkbox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate?: boolean; onChange: () => void }) {
  const active = checked || indeterminate
  return (
    <div
      onClick={e => { e.stopPropagation(); onChange() }}
      style={{
        width: 16, height: 16, borderRadius: 5, flexShrink: 0,
        border: `1.5px solid ${active ? AC : 'rgba(255,255,255,.2)'}`,
        background: active ? AC : 'rgba(255,255,255,.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all .15s',
      }}
    >
      {indeterminate && !checked
        ? <Minus size={10} color="#0a0612" strokeWidth={3} />
        : checked
        ? <Check size={10} color="#0a0612" strokeWidth={3} />
        : null}
    </div>
  )
}

const STATUS_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'pago', label: 'Pago' },
  { value: 'aguardando_pagamento', label: 'Pendente' },
  { value: 'cancelado', label: 'Cancelado' },
]

export default function AdminPedidosPage() {
  const [orders, setOrders]     = useState<Order[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filterS, setFilterS]   = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  function loadOrders() {
    setLoading(true)
    fetch('/api/admin/orders')
      .then(r => r.json())
      .then(d => setOrders(Array.isArray(d) ? d : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadOrders() }, [])

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    if (q && !o.clientName.toLowerCase().includes(q) && !o.clientEmail.toLowerCase().includes(q) && !o.id.toLowerCase().includes(q)) return false
    if (filterS && o.status !== filterS) return false
    return true
  })

  const allSelected  = filtered.length > 0 && filtered.every(o => selected.has(o.id))
  const someSelected = filtered.some(o => selected.has(o.id))

  function toggleAll() {
    if (allSelected) {
      setSelected(s => { const n = new Set(s); filtered.forEach(o => n.delete(o.id)); return n })
    } else {
      setSelected(s => { const n = new Set(s); filtered.forEach(o => n.add(o.id)); return n })
    }
  }

  function toggleOne(id: string) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function deleteSelected() {
    const ids = filtered.filter(o => selected.has(o.id)).map(o => o.id)
    if (!ids.length) return
    if (!confirm(`Excluir ${ids.length} pedido(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return
    setDeleting(true)
    try {
      await Promise.all(ids.map(id => fetch(`/api/admin/orders/${id}`, { method: 'DELETE' })))
      setSelected(new Set())
      loadOrders()
    } finally {
      setDeleting(false)
    }
  }

  const nSelected = [...selected].filter(id => filtered.some(o => o.id === id)).length

  return (
    <DashboardShell isAdmin userName="Admin">
      <TopBar
        title="Pedidos"
        sub={loading ? 'Carregando...' : `${orders.length} pedidos no total`}
      />
      <div className="p-6 flex flex-col gap-4">

        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <Input
              placeholder="Buscar por cliente, e-mail ou ID..."
              value={search}
              onChange={e => { setSearch(e.target.value); setSelected(new Set()) }}
              left={<Search size={14} />}
            />
          </div>
          <div className="w-44">
            <Select options={STATUS_OPTS} value={filterS} onChange={e => { setFilterS(e.target.value); setSelected(new Set()) }} />
          </div>
        </div>

        {/* BARRA DE SELEÇÃO */}
        {nSelected > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(168,85,247,.1)', border: '1px solid rgba(168,85,247,.25)', borderRadius: 12, padding: '10px 16px' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'color-mix(in srgb,#a855f7 45%,#ffffff)' }}>
              {nSelected} pedido{nSelected > 1 ? 's' : ''} selecionado{nSelected > 1 ? 's' : ''}
            </span>
            <button
              onClick={deleteSelected}
              disabled={deleting}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(248,113,113,.4)', background: 'rgba(248,113,113,.1)', color: '#f87171', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? .6 : 1 }}
            >
              <Trash2 size={14} />
              {deleting ? 'Excluindo...' : `Excluir ${nSelected}`}
            </button>
          </div>
        )}

        <Card padded={false}>
          {loading ? (
            <p className="text-center text-(--text-faint) text-sm py-10">Carregando...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--border)">
                  <th className="px-4 py-3 w-10">
                    <Checkbox checked={allSelected} indeterminate={someSelected && !allSelected} onChange={toggleAll} />
                  </th>
                  {['ID', 'Cliente', 'Produto', 'Total', 'Data', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-(--text-faint) px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-(--text-faint) py-10">Nenhum pedido encontrado.</td></tr>
                ) : filtered.map(o => {
                  const isSelected = selected.has(o.id)
                  return (
                    <tr
                      key={o.id}
                      onClick={() => toggleOne(o.id)}
                      className="border-b border-(--border) last:border-0 transition-colors cursor-pointer"
                      style={{ background: isSelected ? 'rgba(168,85,247,.06)' : undefined }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,.02)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(168,85,247,.06)' : 'transparent' }}
                    >
                      <td className="px-4 py-3">
                        <Checkbox checked={isSelected} onChange={() => toggleOne(o.id)} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-(--text-faint)">{o.id.slice(0, 8)}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-(--text)">{o.clientName}</p>
                        <p className="text-xs text-(--text-faint)">{o.clientEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-(--text-muted)">Proxy Residencial · {o.quantity}GB</td>
                      <td className="px-4 py-3 font-semibold text-(--text)">{fmtBRL(o.totalBrl)}</td>
                      <td className="px-4 py-3 text-(--text-faint) text-xs">{fmtDate(o.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(o.status)} dot>{statusLabel(o.status)}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </DashboardShell>
  )
}
