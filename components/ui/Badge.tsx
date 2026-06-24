import { cn } from '@/lib/utils/cn'
import { HTMLAttributes } from 'react'

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple'
  | 'muted'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-white/5    border-white/10      text-(--text-muted)',
  success: 'bg-(--green)/10 border-(--green)/30  text-(--green)',
  warning: 'bg-(--yellow)/10 border-(--yellow)/30 text-(--yellow)',
  danger:  'bg-(--red)/10  border-(--red)/30    text-(--red)',
  purple:  'bg-(--ac)/10   border-(--border-hi) text-(--ac)',
  muted:   'bg-white/5    border-white/5       text-(--text-faint)',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

export function Badge({ variant = 'default', dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
        variants[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'size-1.5 rounded-full',
            variant === 'success' && 'bg-(--green) shadow-[0_0_6px_var(--green)]',
            variant === 'warning' && 'bg-(--yellow)',
            variant === 'danger'  && 'bg-(--red)',
            variant === 'purple'  && 'bg-(--ac)',
            !['success','warning','danger','purple'].includes(variant) && 'bg-current',
          )}
        />
      )}
      {children}
    </span>
  )
}

/* helpers para status comuns */
export function statusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    ativa:                 'success',
    disponivel:            'success',
    pago:                  'success',
    inativa:               'muted',
    suspensa:              'danger',
    vendida:               'muted',
    pendente:              'warning',
    aguardando_pagamento:  'warning',
    cancelado:             'danger',
    reembolsado:           'warning',
  }
  return map[status.toLowerCase()] ?? 'default'
}
