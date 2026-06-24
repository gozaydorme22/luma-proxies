import { ReactNode } from 'react'

interface TopBarProps {
  title: string
  sub?: string
  actions?: ReactNode
}

export function TopBar({ title, sub, actions }: TopBarProps) {
  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-(--border) bg-(--bg)/80 backdrop-blur-sm sticky top-0 z-10">
      <div>
        <h1 className="text-base font-semibold text-(--text)">{title}</h1>
        {sub && <p className="text-xs text-(--text-faint)">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
