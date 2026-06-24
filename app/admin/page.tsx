import { DashboardShell } from '@/components/layout/DashboardShell'
import { TopBar } from '@/components/layout/TopBar'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge, statusVariant } from '@/components/ui/Badge'
import { Package, ShoppingCart, Users, DollarSign } from 'lucide-react'

const RECENT_ORDERS = [
  { id: '#0042', client: 'João Silva',    product: 'Residencial 10GB', total: 'R$ 49,90',  status: 'pago' },
  { id: '#0041', client: 'Maria Souza',   product: 'Mobile 5GB',       total: 'R$ 29,90',  status: 'pago' },
  { id: '#0040', client: 'Pedro Lima',    product: 'CPA 50GB',         total: 'R$ 89,90',  status: 'pendente' },
  { id: '#0039', client: 'Ana Costa',     product: 'IPv4 x5',          total: 'R$ 150,00', status: 'pago' },
  { id: '#0038', client: 'Lucas Mendes',  product: 'Residencial 10GB', total: 'R$ 49,90',  status: 'cancelado' },
]

function statusLabel(s: string) {
  const map: Record<string, string> = { pago: 'Pago', pendente: 'Pendente', cancelado: 'Cancelado' }
  return map[s] ?? s
}

export default function AdminPage() {
  return (
    <DashboardShell isAdmin userName="Admin" userEmail="admin@lumaproxies.com">
      <TopBar title="Painel Admin" sub="Visão geral do negócio" />
      <div className="p-6 flex flex-col gap-6">

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Proxies em estoque" value="2.847"
            icon={<Package size={16} />}
            trend={{ value: '+120 hoje', up: true }}
          />
          <StatCard
            label="Pedidos hoje" value="14"
            icon={<ShoppingCart size={16} />}
            trend={{ value: '+3 vs ontem', up: true }}
          />
          <StatCard
            label="Clientes ativos" value="386"
            icon={<Users size={16} />}
            trend={{ value: '+8 essa semana', up: true }}
          />
          <StatCard
            label="Receita mês" value="R$ 8.420"
            icon={<DollarSign size={16} />}
            trend={{ value: '+R$ 1.2k vs mês ant.', up: true }}
          />
        </div>

        {/* pedidos recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos recentes</CardTitle>
          </CardHeader>
          <div className="flex flex-col divide-y divide-(--border)">
            {RECENT_ORDERS.map(o => (
              <div key={o.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-(--text-faint) w-12">{o.id}</span>
                  <div>
                    <p className="text-sm font-medium text-(--text)">{o.client}</p>
                    <p className="text-xs text-(--text-faint)">{o.product}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-(--text)">{o.total}</span>
                  <Badge variant={statusVariant(o.status)} dot>{statusLabel(o.status)}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </DashboardShell>
  )
}
