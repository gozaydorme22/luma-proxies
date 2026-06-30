'use client'

import { useState, useEffect } from 'react'
import { subscribeToast, type ToastData } from '@/lib/toast'

type ToastItem = ToastData & { visible: boolean }

const colors = {
  success: { bg: 'rgba(52,211,153,.13)',  border: 'rgba(52,211,153,.32)',  text: '#34d399' },
  error:   { bg: 'rgba(248,113,113,.13)', border: 'rgba(248,113,113,.32)', text: '#f87171' },
  info:    { bg: 'rgba(168,85,247,.13)',  border: 'rgba(168,85,247,.32)',  text: '#c084fc' },
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const unsub = subscribeToast(t => {
      setToasts(prev => [...prev, { ...t, visible: true }])
      setTimeout(() => {
        setToasts(prev => prev.map(x => x.id === t.id ? { ...x, visible: false } : x))
        setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 350)
      }, 3000)
    })
    return unsub
  }, [])

  if (!toasts.length) return null

  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8,
      alignItems: 'center', pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const c = colors[t.type]
        return (
          <div key={t.id} style={{
            padding: '11px 20px',
            borderRadius: 12,
            background: c.bg,
            border: `1px solid ${c.border}`,
            color: c.text,
            fontSize: 14, fontWeight: 600,
            fontFamily: "'Manrope', sans-serif",
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(0,0,0,.45)',
            whiteSpace: 'nowrap',
            opacity: t.visible ? 1 : 0,
            transform: t.visible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(.97)',
            transition: 'opacity .3s ease, transform .3s ease',
            pointerEvents: 'auto',
          }}>
            {t.message}
          </div>
        )
      })}
    </div>
  )
}
