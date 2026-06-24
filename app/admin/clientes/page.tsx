'use client'

import { useState } from 'react'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { TopBar } from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Search, ShieldOff, Eye } from 'lucide-react'

const CLIENTS = [
  { id: 'uid_1', name: 'João Silva',   email: 'joao@email.com',  orders: 5,  spent: 'R$ 249,50', joined: '10/01/2026', blocked: false },
  { id: 'uid_2', name: 'Maria Souza',  email: 'maria@email.com', orders: 3,  spent: 'R$ 149,70', joined: '15/02/2026', blocked: false },
  { id: 'uid_3', name: 'Pedro Lima',   email: 'pedro@email.com', orders: 8,  spent: 'R$ 719,20', joined: '03/03/2026', blocked: false },
  { id: 'uid_4', name: 'Ana Costa',    email: 'ana@email.com',   orders: 1,  spent: 'R$ 150,00', joined: '20/04/2026', blocked: true  },
  { id: 'uid_5', name: 'Lucas Mendes', email: 'lucas@email.com', orders: 12, spent: 'R$ 988,80', joined: '01/05/2026', blocked: false },
]

export default function ClientesPage() {
  const [search, setSearch] = useState('')

  const filtered = CLIENTS.filter(c => {
    const q = search.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.email.includes(q)
  })

  return (
    <DashboardShell isAdmin userName="Admin">
      <TopBar title="Clientes" sub={`${CLIENTS.length} clientes cadastrados`} />
      <div className="p-6 flex flex-col gap-4">
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          left={<Search size={14} />}
        />

        <Card padded={false}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border)">
                {['Cliente', 'Pedidos', 'Total gasto', 'Cadastro', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-(--text-faint) px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-(--border) last:border-0 hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-full bg-gradient-to-br from-(--ac) to-(--acd) flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {c.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-(--text)">{c.name}</p>
                        <p className="text-xs text-(--text-faint)">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-(--text-muted)">{c.orders}</td>
                  <td className="px-4 py-3 font-semibold text-(--text)">{c.spent}</td>
                  <td className="px-4 py-3 text-xs text-(--text-faint)">{c.joined}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.blocked ? 'danger' : 'success'} dot>
                      {c.blocked ? 'Bloqueado' : 'Ativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-lg text-(--text-faint) hover:text-(--text) hover:bg-white/5 transition-colors">
                        <Eye size={13} />
                      </button>
                      <button className="p-1.5 rounded-lg text-(--text-faint) hover:text-(--red) hover:bg-(--red)/10 transition-colors">
                        <ShieldOff size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </DashboardShell>
  )
}
