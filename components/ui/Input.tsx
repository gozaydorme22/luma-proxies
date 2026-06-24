'use client'

import { cn } from '@/lib/utils/cn'
import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  left?: ReactNode
  right?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, left, right, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-(--text-muted)">
            {label}
          </label>
        )}
        <div
          className={cn(
            'flex items-center gap-2 h-10 px-3 rounded-xl border bg-white/4',
            'border-(--border) focus-within:border-(--ac) focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--ac)_20%,transparent)]',
            'transition-all duration-150',
            error && 'border-(--red)/50 focus-within:border-(--red) focus-within:shadow-[0_0_0_2px_color-mix(in_srgb,var(--red)_20%,transparent)]',
          )}
        >
          {left && <span className="text-(--text-faint) flex-shrink-0">{left}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'flex-1 bg-transparent text-sm text-(--text) placeholder:text-(--text-faint) outline-none min-w-0',
              'font-[family-name:var(--font-manrope)]',
              className,
            )}
            {...props}
          />
          {right && <span className="text-(--text-faint) flex-shrink-0">{right}</span>}
        </div>
        {(error || hint) && (
          <p className={cn('text-xs', error ? 'text-(--red)' : 'text-(--text-faint)')}>
            {error ?? hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
