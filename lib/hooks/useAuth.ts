'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setLoading(false)

      if (u) {
        // Atualiza o cookie __session a cada mudança de estado
        const token = await u.getIdToken()
        document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Strict`
      } else {
        document.cookie = '__session=; path=/; max-age=0'
      }
    })
  }, [])

  return { user, loading }
}
