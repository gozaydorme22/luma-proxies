'use client'

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  AuthError,
} from 'firebase/auth'
import { auth } from './client'

function parseError(e: AuthError): string {
  const map: Record<string, string> = {
    'auth/invalid-credential':       'E-mail ou senha incorretos.',
    'auth/user-not-found':           'Usuário não encontrado.',
    'auth/wrong-password':           'Senha incorreta.',
    'auth/email-already-in-use':     'Este e-mail já está em uso.',
    'auth/weak-password':            'Senha muito fraca. Use ao menos 6 caracteres.',
    'auth/invalid-email':            'E-mail inválido.',
    'auth/too-many-requests':        'Muitas tentativas. Tente novamente em alguns minutos.',
    'auth/network-request-failed':   'Erro de conexão. Verifique sua internet.',
  }
  return map[e.code] ?? 'Ocorreu um erro. Tente novamente.'
}

export async function signIn(email: string, password: string) {
  try {
    const cred  = await signInWithEmailAndPassword(auth, email, password)
    const token = await cred.user.getIdToken()
    await fetch('/api/auth/session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
    return { user: cred.user, error: null }
  } catch (e) {
    return { user: null, error: parseError(e as AuthError) }
  }
}

export async function signUp(email: string, password: string, name: string) {
  try {
    // Se já existe conta não verificada com esse email, apaga antes de criar
    await fetch('/api/auth/reset-unverified', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })

    const token = await cred.user.getIdToken()
    await fetch('/api/auth/session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })

    const vRes = await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    })

    if (!vRes.ok) {
      const vData = await vRes.json().catch(() => ({}))
      return { user: null, error: vData.error ?? 'Erro ao enviar código de verificação.' }
    }

    return { user: cred.user, error: null }
  } catch (e) {
    return { user: null, error: parseError(e as AuthError) }
  }
}

export async function signOut() {
  await firebaseSignOut(auth)
  await fetch('/api/auth/session', { method: 'DELETE' })
}
