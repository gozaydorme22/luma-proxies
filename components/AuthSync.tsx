'use client'

import { useEffect } from 'react'
import { onIdTokenChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

export function AuthSync() {
  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken()
        fetch('/api/auth/session', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ token }),
        }).catch(() => {})
      } else {
        fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {})
      }
    })
    return unsub
  }, [])

  return null
}
