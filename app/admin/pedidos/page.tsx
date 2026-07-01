'use client'

import { useState, useEffect } from 'react'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Badge, statusVariant } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Search } from 'lucide-react'

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

const STATUS_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'pago', label: 'Pago' },
  { value: 'aguardando_pagamento', label: 'Pendente' },
  { value: 'cancelado', label: 'Cancelado' },
]

export default function AdminPedidosPage() {
  const [orders, setOrders]       = useState<Order[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterS, setFilterS]     = useState('')
  const [cancelling, setCancelling]   = useState<string | null>(null)
  const [deleting, setDeleting]       = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  function loadOrders() {
    fetch('/api/admin/orders')
      .then(r => r.json())
      .then(d => setOrders(Array.isArray(d) ? d : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadOrders() }, [])

  async function handleDelete(id: string) {
    if (!confirm('Excluir este pedido permanentemente?')) return
    setDeleting(id)
    try {
      await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' })
      loadOrders()
    } finally {
      setDeleting(null)
    }
  }

  async function handleBulkDelete(status: string) {
    if (!confirm(`Excluir TODOS os pedidos? Esta ação não pode ser desfeita.`)) return
    setBulkDeleting(true)
    try {
      const res  = await fetch(`/api/admin/orders?status=${status}`, { method: 'DELETE' })
      const data = await res.json()
      alert(`${data.deleted} pedido(s) excluído(s).`)
      loadOrders()
    } finally {
      setBulkDeleting(false)
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancelar este pedido? A proxy será devolvida ao estoque.')) return
    setCancelling(id)
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelado' }),
      })
      if (res.ok) loadOrders()
      else { const d = await res.json(); alert(d.error ?? 'Erro ao cancelar.') }
    } finally {
      setCancelling(null)
    }
  }

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    if (q && !o.clientName.toLowerCase().includes(q) && !o.clientEmail.toLowerCase().includes(q) && !o.id.toLowerCase().includes(q)) return false
    if (filterS && o.status !== filterS) return false
    return true
  })

  return (
    <DashboardShell isAdmin userName="Admin">
      <TopBar
        title="Pedidos"
        sub={loading ? 'Carregando...' : `${orders.length} pedidos no total`}
        actions={
          <button
            onClick={() => handleBulkDelete('')}
            disabled={bulkDeleting}
            className="text-xs font-bold px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 cursor-pointer"
          >
            {bulkDeleting ? 'Excluindo...' : 'Excluir todos os pedidos'}
          </button>
        }
      />
      <div className="p-6 flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="Buscar por cliente, e-mail ou ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              left={<Search size={14} />}
            />
          </div>
          <div className="w-44">
            <Select options={STATUS_OPTS} value={filterS} onChange={e => setFilterS(e.target.value)} />
          </div>
        </div>

        <Card padded={false}>
          {loading ? (
            <p className="text-center text-(--text-faint) text-sm py-10">Carregando...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-(--border)">
                  {['ID', 'Cliente', 'Produto', 'Total', 'Data', 'Status', ''].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-(--text-faint) px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-(--text-faint) py-10">Nenhum pedido encontrado.</td></tr>
                ) : filtered.map(o => (
                  <tr key={o.id} className="border-b border-(--border) last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-(--text-faint)">{o.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-(--text)">{o.clientName}</p>
                      <p className="text-xs text-(--text-faint)">{o.clientEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-(--text-muted)">Proxy Residencial Rotativa · {o.quantity}GB</td>
                    <td className="px-4 py-3 font-semibold text-(--text)">{fmtBRL(o.totalBrl)}</td>
                    <td className="px-4 py-3 text-(--text-faint) text-xs">{fmtDate(o.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(o.status)} dot>{statusLabel(o.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 items-center">
                        {o.status !== 'cancelado' && o.status !== 'reembolsado' && (
                          <button
                            onClick={() => handleCancel(o.id)}
                            disabled={cancelling === o.id}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-(--red)/30 text-(--red) hover:bg-(--red)/10 transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            {cancelling === o.id ? '...' : 'Cancelar'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(o.id)}
                          disabled={deleting === o.id}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-800/40 text-red-600 hover:bg-red-900/20 transition-colors disabled:opacity-40 cursor-pointer"
                          title="Excluir permanentemente"
                        >
                          {deleting === o.id ? '...' : '🗑'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </DashboardShell>
  )
}
