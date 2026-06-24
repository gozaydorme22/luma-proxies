import { cn } from '@/lib/utils/cn'
import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: ReactNode
  sub?: string
  icon?: ReactNode
  trend?: { value: string; up: boolean }
  className?: string
}

export function StatCard({ label, value, sub, icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-(--border) bg-(--card) backdrop-blur-sm p-5 flex flex-col gap-3',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-(--text-muted)">{label}</span>
        {icon && (
          <span className="size-8 rounded-xl bg-(--ac)/10 border border-(--border-hi) flex items-center justify-center text-(--ac)">
            {icon}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-2xl font-bold text-(--text) tracking-tight">{value}</span>
        {sub && <span className="text-xs text-(--text-faint)">{sub}</span>}
      </div>

      {trend && (
        <div className={cn('flex items-center gap-1 text-xs font-medium', trend.up ? 'text-(--green)' : 'text-(--red)')}>
          <svg viewBox="0 0 10 10" className="size-3 fill-current">
            {trend.up
              ? <path d="M5 1 9 9H1z" />
              : <path d="M5 9 1 1h8z" />
            }
          </svg>
          {trend.value}
        </div>
      )}
    </div>
  )
}
