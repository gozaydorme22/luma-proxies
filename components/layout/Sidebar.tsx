'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import {
  LayoutGrid, Globe, Zap, ShoppingCart, Clock,
  Settings, LogOut, ChevronRight, Tag, Package,
} from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Proxies',   href: '/dashboard/proxies',  icon: Globe },
  { label: 'Consumo',   href: '/dashboard/consumo',  icon: Zap },
  { label: 'Recarga',   href: '/dashboard?checkout=1',  icon: ShoppingCart },
  { label: 'Pedidos',   href: '/dashboard/pedidos',  icon: Clock },
]

const ADMIN_ITEMS = [
  { label: 'Painel',    href: '/admin',           icon: LayoutGrid },
  { label: 'Pedidos',   href: '/admin/pedidos',   icon: ShoppingCart },
  { label: 'Clientes',  href: '/admin/clientes',  icon: Settings },
  { label: 'Produtos',  href: '/admin/produtos',  icon: Package },
  { label: 'Cupons',    href: '/admin/cupons',    icon: Tag },
]

interface SidebarProps {
  isAdmin?: boolean
  userName?: string
  userEmail?: string
}

export function Sidebar({ isAdmin, userName, userEmail }: SidebarProps) {
  const pathname = usePathname()
  const items = isAdmin ? ADMIN_ITEMS : NAV_ITEMS

  return (
    <aside className="flex flex-col w-[250px] shrink-0 min-h-screen bg-(--bg) border-r border-(--border)">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-(--border)">
        <span className="text-base font-black tracking-tight text-(--text)">
          LUMA<span className="text-(--ac)"> PROXYS</span>
        </span>
        {isAdmin && (
          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-md bg-(--ac)/15 text-(--ac) font-semibold border border-(--border-hi)">
            ADMIN
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5">
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 h-9 px-3 rounded-xl text-sm transition-all duration-150',
                active
                  ? 'text-(--text) bg-white/5 shadow-[inset_3px_0_0_var(--ac)]'
                  : 'text-(--text-muted) hover:text-(--text) hover:bg-white/4',
              )}
            >
              <Icon size={16} strokeWidth={1.75} />
              <span>{label}</span>
              {active && <ChevronRight size={12} className="ml-auto opacity-40" />}
            </Link>
          )
        })}

        {/* link cruzado admin↔cliente */}
        <div className="mt-auto pt-4 border-t border-(--border)">
          {isAdmin ? (
            <Link href="/" className="flex items-center gap-3 h-9 px-3 rounded-xl text-sm text-(--text-muted) hover:text-(--text) hover:bg-white/4 transition-all">
              <Globe size={16} />
              Ver como cliente
            </Link>
          ) : (
            <Link href="/admin" className="flex items-center gap-3 h-9 px-3 rounded-xl text-sm text-(--text-muted) hover:text-(--text) hover:bg-white/4 transition-all">
              <LayoutGrid size={16} />
              Painel Admin
            </Link>
          )}
        </div>
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-(--border)">
        <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/4 transition-colors group">
          <div className="size-8 rounded-full bg-gradient-to-br from-(--ac) to-(--acd) flex items-center justify-center text-white text-xs font-bold shrink-0">
            {userName?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-(--text) truncate">{userName ?? 'Usuário'}</p>
            <p className="text-[10px] text-(--text-faint) truncate">{userEmail}</p>
          </div>
          <button
            onClick={() => { /* logout handler */ }}
            className="opacity-0 group-hover:opacity-100 text-(--text-faint) hover:text-(--red) transition-all"
            title="Sair"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
