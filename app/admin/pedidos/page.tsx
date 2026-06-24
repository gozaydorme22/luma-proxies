'use client'

import { useState } from 'react'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Badge, statusVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Search } from 'lucide-react'

const ORDERS = [
  { id: '#0042', client: 'João Silva',   email: 'joao@email.com',  product: 'Residencial 10GB', qty: '10 GB', total: 'R$ 49,90',  status: 'pago',     date: '23/06/2026' },
  { id: '#0041', client: 'Maria Souza',  email: 'maria@email.com', product: 'Mobile 5GB',       qty: '5 GB',  total: 'R$ 29,90',  status: 'pago',     date: '22/06/2026' },
  { id: '#0040', client: 'Pedro Lima',   email: 'pedro@email.com', product: 'CPA 50GB',         qty: '50 GB', total: 'R$ 89,90',  status: 'pendente', date: '21/06/2026' },
  { id: '#0039', client: 'Ana Costa',    email: 'ana@email.com',   product: 'IPv4 x5',          qty: '5 un',  total: 'R$ 150,00', status: 'pago',     date: '20/06/2026' },
  { id: '#0038', client: 'Lucas Mendes', email: 'lucas@email.com', product: 'Residencial 10GB', qty: '10 GB', total: 'R$ 49,90',  status: 'cancelado',date: '19/06/2026' },
]

const STATUS_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'pago', label: 'Pago' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'cancelado', label: 'Cancelado' },
]

function statusLabel(s: string) {
  const map: Record<string, string> = { pago: 'Pago', pendente: 'Pendente', cancelado: 'Cancelado', reembolsado: 'Reembolsado' }
  return map[s] ?? s
}

export default function AdminPedidosPage() {
  const [search, setSearch]     = useState('')
  const [filterS, setFilterS]   = useState('')

  const filtered = ORDERS.filter(o => {
    const q = search.toLowerCase()
    if (q && !o.client.toLowerCase().includes(q) && !o.id.includes(q) && !o.email.includes(q)) return false
    if (filterS && o.status !== filterS) return false
    return true
  })

  return (
    <DashboardShell isAdmin userName="Admin">
      <TopBar title="Pedidos" sub={`${ORDERS.length} pedidos no total`} />
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border)">
                {['ID', 'Cliente', 'Produto', 'Qtd', 'Total', 'Data', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-(--text-faint) px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} className="border-b border-(--border) last:border-0 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-(--text-faint)">{o.id}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-(--text)">{o.client}</p>
                    <p className="text-xs text-(--text-faint)">{o.email}</p>
                  </td>
                  <td className="px-4 py-3 text-(--text-muted)">{o.product}</td>
                  <td className="px-4 py-3 text-(--text-muted)">{o.qty}</td>
                  <td className="px-4 py-3 font-semibold text-(--text)">{o.total}</td>
                  <td className="px-4 py-3 text-(--text-faint) text-xs">{o.date}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(o.status)} dot>{statusLabel(o.status)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {o.status === 'pendente' && (
                      <Button variant="secondary" size="sm" className="text-(--green) border-(--green)/30 hover:bg-(--green)/10">Confirmar</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-(--text-faint) text-sm py-10">Nenhum pedido encontrado.</p>
          )}
        </Card>
      </div>
    </DashboardShell>
  )
}
