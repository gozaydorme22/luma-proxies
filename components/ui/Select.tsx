'use client'

import { cn } from '@/lib/utils/cn'
import { SelectHTMLAttributes, forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-(--text-muted)">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full h-10 pl-3 pr-8 rounded-xl border bg-(--bg) text-sm text-(--text) appearance-none outline-none',
              'border-(--border) focus:border-(--ac) focus:shadow-[0_0_0_2px_color-mix(in_srgb,var(--ac)_20%,transparent)]',
              'transition-all duration-150 cursor-pointer',
              error && 'border-(--red)/50',
              className,
            )}
            {...props}
          >
            {options.map(o => (
              <option key={o.value} value={o.value} className="bg-[#0d0b12]">
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-faint) pointer-events-none" />
        </div>
        {error && <p className="text-xs text-(--red)">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
