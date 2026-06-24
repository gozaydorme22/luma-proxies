'use client'

import { cn } from '@/lib/utils/cn'
import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  primary:   'bg-(--ac) text-white hover:brightness-110 active:brightness-90 shadow-[0_0_16px_color-mix(in_srgb,var(--ac)_40%,transparent)]',
  secondary: 'bg-white/5 border border-(--border) text-(--text) hover:bg-white/10 hover:border-(--border-hi)',
  ghost:     'text-(--text-muted) hover:text-(--text) hover:bg-white/5',
  danger:    'bg-(--red)/10 border border-(--red)/30 text-(--red) hover:bg-(--red)/20',
}

const sizes: Record<Size, string> = {
  sm: 'h-7  px-3 text-xs  gap-1.5 rounded-lg',
  md: 'h-9  px-4 text-sm  gap-2   rounded-xl',
  lg: 'h-11 px-6 text-sm  gap-2.5 rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-[lumaSpin_0.6s_linear_infinite]" />
      )}
      {children}
    </button>
  )
)

Button.displayName = 'Button'
