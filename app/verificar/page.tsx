'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/firebase/client'

const AC  = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

export default function VerificarPage() {
  const router = useRouter()
  const [digits, setDigits]   = useState(['', '', '', '', '', ''])
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [email, setEmail]     = useState('')
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const user = auth.currentUser
    if (!user) { router.replace('/login'); return }
    setEmail(user.email ?? '')
    inputs.current[0]?.focus()
  }, [router])

  function handleChange(i: number, val: string) {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = v
    setDigits(next)
    if (v && i < 5) inputs.current[i + 1]?.focus()
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (paste.length === 6) {
      setDigits(paste.split(''))
      inputs.current[5]?.focus()
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const code = digits.join('')
    if (code.length < 6) { setError('Digite todos os 6 dígitos.'); return }
    setError(null)
    setLoading(true)

    try {
      const res  = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao verificar.'); setLoading(false); return }

      // Força o Firebase a recarregar o token (agora email_verified = true)
      const user = auth.currentUser
      if (user) {
        const newToken = await user.getIdToken(true)
        await fetch('/api/auth/session', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ token: newToken }),
        })
        // Insere cliente no banco (ignora se já existir — 23505)
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: user.displayName ?? '', email: user.email ?? '' }),
        }).catch(() => null)
      }

      router.replace('/')
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  async function handleResend() {
    const user = auth.currentUser
    if (!user) return
    setResending(true)
    setError(null)
    try {
      await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user.displayName ?? '', email: user.email ?? '' }),
      })
      setSent(true)
      setDigits(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
      setTimeout(() => setSent(false), 5000)
    } catch { /* ignore */ }
    setResending(false)
  }

  const code = digits.join('')
  const filled = code.length === 6

  return (
    <div style={{ minHeight: '100vh', background: '#08070c', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'Manrope',sans-serif", color: '#f4f2f8' }}>

      {/* glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: AC, opacity: .07, filter: 'blur(120px)' }}/>
      </div>

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', zIndex: 10 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: '-.02em', color: '#f4f2f8' }}>
              LUMA<span style={{ color: AC2 }}> PROXYS</span>
            </span>
          </Link>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: '36px 32px' }}>

          {/* Ícone */}
          <div style={{ width: 52, height: 52, borderRadius: 14, background: `color-mix(in srgb,${AC} 16%,transparent)`, border: `1px solid color-mix(in srgb,${AC} 30%,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, color: AC2 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          </div>

          <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: '-.02em', margin: '0 0 8px' }}>
            Verifique seu e-mail
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(244,242,248,.55)', margin: '0 0 28px', lineHeight: 1.6 }}>
            Enviamos um código de 6 dígitos para{' '}
            <span style={{ color: '#f4f2f8', fontWeight: 600 }}>{email || '...'}</span>
          </p>

          <form onSubmit={handleSubmit}>
            {/* 6 boxes */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }} onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputs.current[i] = el }}
                  className="otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  style={{
                    width: 48, height: 56, borderRadius: 12, textAlign: 'center',
                    fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace",
                    background: d ? `color-mix(in srgb,${AC} 12%,rgba(255,255,255,.04))` : 'rgba(255,255,255,.04)',
                    border: `1.5px solid ${d ? `color-mix(in srgb,${AC} 50%,transparent)` : 'rgba(255,255,255,.1)'}`,
                    color: '#f4f2f8', outline: 'none', transition: 'border-color .15s, background .15s, box-shadow .15s',
                  }}
                />
              ))}
            </div>

            {error && (
              <div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 16 }}>
                {error}
              </div>
            )}

            {sent && (
              <div style={{ background: 'rgba(52,211,153,.08)', border: '1px solid rgba(52,211,153,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#34d399', marginBottom: 16 }}>
                Novo código enviado!
              </div>
            )}

            <button
              type="submit"
              disabled={!filled || loading}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 13, border: 'none',
                background: filled ? AC : 'rgba(255,255,255,.06)',
                color: filled ? '#0a0612' : 'rgba(244,242,248,.3)',
                fontFamily: "'Manrope',sans-serif", fontWeight: 800, fontSize: 15,
                cursor: filled ? 'pointer' : 'not-allowed',
                boxShadow: filled ? `0 10px 30px color-mix(in srgb,${AC} 40%,transparent)` : 'none',
                transition: 'all .2s',
              }}
            >
              {loading ? 'Verificando...' : 'Verificar e-mail'}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'rgba(244,242,248,.4)' }}>
            Não recebeu?{' '}
            <button
              onClick={handleResend}
              disabled={resending}
              style={{ background: 'none', border: 'none', color: AC2, fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope',sans-serif", fontSize: 13, padding: 0 }}
            >
              {resending ? 'Enviando...' : 'Reenviar código'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(244,242,248,.3)', marginTop: 20 }}>
          E-mail errado?{' '}
          <Link href="/cadastro" style={{ color: AC2, fontWeight: 600, textDecoration: 'none' }}>Voltar</Link>
        </p>
      </div>
    </div>
  )
}
