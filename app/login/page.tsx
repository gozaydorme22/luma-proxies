'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/firebase/auth-actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Mail, Lock } from 'lucide-react'

function LoginForm() {
  const router       = useRouter()
  const params       = useSearchParams()
  const redirect     = params.get('redirect') ?? '/'

  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) { setError(err); return }
    router.push(redirect)
  }

  return (
    <div className="min-h-screen bg-(--bg) flex items-center justify-center p-4">
      {/* Botão voltar */}
      <Link href="/" className="fixed top-4 left-4 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/10 text-(--text-muted) hover:text-(--text) hover:bg-white/8 transition-all">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </Link>
      {/* glow de fundo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-(--ac) opacity-[0.07] blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-black tracking-tight text-(--text)">
              LUMA<span className="text-(--ac)"> PROXYS</span>
            </span>
          </Link>
          <p className="text-sm text-(--text-muted) mt-2">Entre na sua conta</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-(--border) bg-(--card) backdrop-blur-sm p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              left={<Mail size={15} />}
              required
              autoComplete="email"
            />
            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPass(e.target.value)}
              left={<Lock size={15} />}
              required
              autoComplete="current-password"
            />

            {error && (
              <p className="text-xs text-(--red) bg-(--red)/8 border border-(--red)/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth loading={loading} size="lg" className="mt-1">
              Entrar
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-(--text-muted) mt-5">
          Não tem conta?{' '}
          <Link href="/cadastro" className="text-(--ac) hover:underline font-medium">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
