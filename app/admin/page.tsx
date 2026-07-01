'use client'

import { useEffect, useState } from 'react'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { TopBar } from '@/components/layout/TopBar'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge, statusVariant } from '@/components/ui/Badge'
import { ShoppingCart, Users, DollarSign } from 'lucide-react'

interface Order {
  id: string
  clientName: string
  clientEmail: string
  quantity: number
  totalBrl: number
  status: string
  createdAt: string
  paidAt?: string
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pago: 'Pago', aguardando_pagamento: 'Pendente',
    cancelado: 'Cancelado', reembolsado: 'Reembolsado',
  }
  return map[s] ?? s
}

function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function monthStart() {
  const d = new Date()
  d.setDate(1); d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default function AdminPage() {
  const [orders, setOrders]           = useState<Order[]>([])
  const [activeClients, setActiveClients] = useState(0)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/orders').then(r => r.json()),
      fetch('/api/admin/proxies?status=sold').then(r => r.json()),
    ]).then(([ord, proxies]) => {
      setOrders(Array.isArray(ord) ? ord : [])
      const uniqueClients = new Set(
        (Array.isArray(proxies) ? proxies : [])
          .map((p: any) => p.assigned_to)
          .filter(Boolean)
      )
      setActiveClients(uniqueClients.size)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const today      = todayStart()
  const monthBegin = monthStart()

  const pedidosHoje = orders.filter(o => o.createdAt >= today).length
  const receitaMes  = orders
    .filter(o => o.status === 'pago' && (o.paidAt ?? o.createdAt) >= monthBegin)
    .reduce((s, o) => s + o.totalBrl, 0)
  const recentes = orders.slice(0, 8)

  return (
    <DashboardShell isAdmin userName="Admin" userEmail="admin@lumaproxies.com">
      <TopBar title="Painel Admin" sub="Visão geral do negócio" />
      <div className="p-6 flex flex-col gap-6">

        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Pedidos hoje"
            value={loading ? '—' : String(pedidosHoje)}
            icon={<ShoppingCart size={16} />}
          />
          <StatCard
            label="Clientes com proxy ativa"
            value={loading ? '—' : String(activeClients)}
            icon={<Users size={16} />}
          />
          <StatCard
            label="Receita do mês"
            value={loading ? '—' : fmtBRL(receitaMes)}
            icon={<DollarSign size={16} />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos recentes</CardTitle>
          </CardHeader>
          {loading ? (
            <p className="text-sm text-(--text-faint) py-4 px-4">Carregando...</p>
          ) : recentes.length === 0 ? (
            <p className="text-sm text-(--text-faint) py-4 px-4">Nenhum pedido ainda.</p>
          ) : (
            <div className="flex flex-col divide-y divide-(--border)">
              {recentes.map(o => (
                <div key={o.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-(--text-faint) w-16 truncate">{o.id.slice(0, 8)}</span>
                    <div>
                      <p className="text-sm font-medium text-(--text)">{o.clientName}</p>
                      <p className="text-xs text-(--text-faint)">{o.clientEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-(--text)">{fmtBRL(o.totalBrl)}</span>
                    <Badge variant={statusVariant(o.status)} dot>{statusLabel(o.status)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </DashboardShell>
  )
}
