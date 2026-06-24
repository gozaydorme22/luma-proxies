'use client'

import { cn } from '@/lib/utils/cn'
import { useEffect, useRef, ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }

export function Modal({ open, onClose, title, description, children, size = 'md', className }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      onClick={e => { if (e.target === backdropRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      style={{ animation: 'lumaRise 0.2s ease' }}
    >
      <div
        className={cn(
          'w-full rounded-2xl border border-(--border) bg-[#0d0b12] shadow-2xl flex flex-col',
          sizes[size],
          className,
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between p-5 border-b border-(--border)">
            <div>
              {title && <h2 className="text-base font-semibold text-(--text)">{title}</h2>}
              {description && <p className="text-sm text-(--text-muted) mt-0.5">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="size-7 rounded-lg flex items-center justify-center text-(--text-faint) hover:text-(--text) hover:bg-white/5 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        )}
        <div className="p-5 flex-1">{children}</div>
      </div>
    </div>
  )
}
