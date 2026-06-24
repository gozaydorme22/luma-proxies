import { cn } from '@/lib/utils/cn'

interface ProgressBarProps {
  value: number      // 0–100
  className?: string
  size?: 'sm' | 'md'
  showLabel?: boolean
}

function barColor(pct: number) {
  if (pct >= 95) return 'bg-(--red)   shadow-[0_0_8px_var(--red)]'
  if (pct >= 75) return 'bg-(--yellow) shadow-[0_0_8px_var(--yellow)]'
  return 'bg-(--ac2) shadow-[0_0_8px_color-mix(in_srgb,var(--ac)_50%,transparent)]'
}

export function ProgressBar({ value, className, size = 'md', showLabel }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  const h   = size === 'sm' ? 'h-1' : 'h-1.5'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 rounded-full bg-white/5 overflow-hidden', h)}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor(pct))}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-(--text-faint) tabular-nums w-9 text-right shrink-0">
          {pct.toFixed(0)}%
        </span>
      )}
    </div>
  )
}
