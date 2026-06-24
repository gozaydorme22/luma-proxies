'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { signOut } from '@/lib/firebase/auth-actions'
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

const AC  = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

type Tab = 'visao-geral' | 'meu-plano' | 'conta'

export default function PerfilPage() {
  const { user } = useAuth()
  const router   = useRouter()

  const [tab, setTab]           = useState<Tab>('conta')
  const [editName, setEditName] = useState(false)
  const [newName, setNewName]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null)

  const [showPwd, setShowPwd]     = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd]       = useState('')
  const [pwdMsg, setPwdMsg]       = useState<{ text: string; ok: boolean } | null>(null)
  const [pwdSaving, setPwdSaving] = useState(false)

  const email   = user?.email ?? ''
  const name    = user?.displayName || email.split('@')[0]
  const initial = name[0]?.toUpperCase() ?? 'U'

  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '—'

  async function saveName() {
    if (!auth.currentUser || !newName.trim()) return
    setSaving(true)
    try {
      await updateProfile(auth.currentUser, { displayName: newName.trim() })
      setMsg({ text: 'Nome atualizado!', ok: true })
      setEditName(false)
    } catch {
      setMsg({ text: 'Erro ao salvar.', ok: false })
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(null), 3000)
    }
  }

  async function savePassword() {
    if (!auth.currentUser || !currentPwd || !newPwd) return
    setPwdSaving(true)
    try {
      const cred = EmailAuthProvider.credential(email, currentPwd)
      await reauthenticateWithCredential(auth.currentUser, cred)
      await updatePassword(auth.currentUser, newPwd)
      setPwdMsg({ text: 'Senha alterada com sucesso!', ok: true })
      setShowPwd(false)
      setCurrentPwd('')
      setNewPwd('')
    } catch (e: unknown) {
      const code = (e as { code?: string }).code
      setPwdMsg({ text: code === 'auth/wrong-password' ? 'Senha atual incorreta.' : 'Erro ao alterar senha.', ok: false })
    } finally {
      setPwdSaving(false)
      setTimeout(() => setPwdMsg(null), 4000)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  const field = (label: string, value: React.ReactNode) => (
    <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '10px 18px 4px', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.14em', color: 'rgba(244,242,248,.35)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ padding: '2px 18px 14px' }}>{value}</div>
    </div>
  )

  const tabStyle = (t: Tab): React.CSSProperties => ({
    fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.14em',
    textTransform: 'uppercase', fontWeight: 700, padding: '10px 16px',
    border: 'none', background: 'none', cursor: 'pointer',
    color: tab === t ? '#f4f2f8' : 'rgba(244,242,248,.38)',
    borderBottom: tab === t ? `2px solid ${AC}` : '2px solid transparent',
    transition: 'color .15s',
  })

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>

      {/* avatar + info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${AC2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#0a0612', boxShadow: `0 0 0 3px rgba(168,85,247,.25), 0 8px 24px rgba(0,0,0,.5)` }}>
            {user?.photoURL
              ? <img src={user.photoURL} width={72} height={72} style={{ borderRadius: '50%', objectFit: 'cover' }} alt="" />
              : initial}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 22, color: '#f4f2f8' }}>{name}</div>
          <div style={{ fontSize: 13, color: 'rgba(244,242,248,.45)', marginTop: 3 }}>{email}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.2)', borderRadius: 999, padding: '4px 10px', fontSize: 11.5, fontWeight: 700, color: '#34d399', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.06em' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
            Conta ativa
          </div>
        </div>
      </div>

      {/* card */}
      <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, background: 'rgba(255,255,255,.02)', overflow: 'hidden' }}>

        {/* tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <button style={tabStyle('visao-geral')} onClick={() => setTab('visao-geral')}>Visão geral</button>
          <button style={tabStyle('meu-plano')}   onClick={() => setTab('meu-plano')}>Meu plano</button>
          <button style={tabStyle('conta')}        onClick={() => setTab('conta')}>Conta</button>
        </div>

        <div style={{ padding: 24 }}>

          {/* ── VISÃO GERAL ── */}
          {tab === 'visao-geral' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Proxies ativas', value: '—', color: AC },
                { label: 'GB consumidos (30d)', value: '—', color: '#f4f2f8' },
                { label: 'GB disponíveis', value: '—', color: '#34d399' },
                { label: 'Pedidos realizados', value: '—', color: '#f4f2f8' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '14px 18px' }}>
                  <span style={{ fontSize: 13.5, color: 'rgba(244,242,248,.6)' }}>{s.label}</span>
                  <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 18, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── MEU PLANO ── */}
          {tab === 'meu-plano' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ border: `1px solid color-mix(in srgb,${AC} 25%,transparent)`, borderRadius: 14, padding: '18px 20px', background: `color-mix(in srgb,${AC} 8%,transparent)` }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.14em', color: AC2, textTransform: 'uppercase' }}>Plano atual</div>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 26, marginTop: 6 }}>Free</div>
                <div style={{ fontSize: 13, color: 'rgba(244,242,248,.5)', marginTop: 4 }}>Sem GB ativo. Adicione saldo para começar.</div>
              </div>
              <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Tipo de proxy', '—'],
                  ['GB ativo', '0 GB'],
                  ['Validade', 'Não expira'],
                  ['Região padrão', 'Brasil'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                    <span style={{ color: 'rgba(244,242,248,.5)' }}>{k}</span>
                    <span style={{ fontWeight: 700, color: '#f4f2f8' }}>{v}</span>
                  </div>
                ))}
              </div>
              <a href="/dashboard/recarga" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 14, padding: '13px 20px', borderRadius: 12, textDecoration: 'none', boxShadow: `0 8px 24px color-mix(in srgb,${AC} 40%,transparent)` }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                Adicionar saldo / Recarregar
              </a>
            </div>
          )}

          {/* ── CONTA ── */}
          {tab === 'conta' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* nome */}
              {field('Nome de usuário',
                editName ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                    <input
                      autoFocus defaultValue={name}
                      onChange={e => setNewName(e.target.value)}
                      style={{ flex: 1, background: 'rgba(255,255,255,.05)', border: `1px solid color-mix(in srgb,${AC} 40%,transparent)`, borderRadius: 8, padding: '8px 12px', color: '#f4f2f8', fontSize: 14, outline: 'none', fontFamily: "'Manrope',sans-serif" }}
                    />
                    <button onClick={saveName} disabled={saving} style={{ background: AC, color: '#0a0612', fontWeight: 700, fontSize: 13, padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>{saving ? '...' : 'Salvar'}</button>
                    <button onClick={() => setEditName(false)} style={{ background: 'rgba(255,255,255,.06)', color: 'rgba(244,242,248,.6)', fontSize: 13, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Cancelar</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#f4f2f8' }}>{name}</span>
                    <button onClick={() => { setEditName(true); setNewName(name) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: AC2, display: 'flex' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                    </button>
                  </div>
                )
              )}
              {msg && <div style={{ fontSize: 12.5, color: msg.ok ? '#34d399' : '#f87171', marginTop: -6 }}>{msg.text}</div>}

              {/* email */}
              {field('E-mail', <span style={{ fontSize: 15, color: 'rgba(244,242,248,.7)' }}>{email}</span>)}

              {/* foto */}
              {field('Foto de perfil',
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${AC2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#0a0612', flexShrink: 0 }}>
                    {user?.photoURL ? <img src={user.photoURL} width={38} height={38} style={{ borderRadius: '50%', objectFit: 'cover' }} alt="" /> : initial}
                  </div>
                  <span style={{ fontSize: 13.5, color: 'rgba(244,242,248,.4)', fontStyle: 'italic' }}>Em breve</span>
                </div>
              )}

              {/* membro desde */}
              {field('Membro desde', <span style={{ fontSize: 15, color: 'rgba(244,242,248,.7)', textTransform: 'capitalize' }}>{memberSince}</span>)}

              {/* senha */}
              {field('Senha',
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 15, color: 'rgba(244,242,248,.4)', letterSpacing: 4 }}>••••••••</span>
                    <button onClick={() => setShowPwd(s => !s)} style={{ background: 'none', border: `1px solid rgba(255,255,255,.12)`, borderRadius: 8, padding: '6px 12px', color: 'rgba(244,242,248,.7)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.08em' }}>
                      {showPwd ? 'CANCELAR' : 'ALTERAR SENHA'}
                    </button>
                  </div>
                  {showPwd && (
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input type="password" placeholder="Senha atual" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
                        style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '9px 12px', color: '#f4f2f8', fontSize: 14, outline: 'none', fontFamily: "'Manrope',sans-serif" }}
                      />
                      <input type="password" placeholder="Nova senha (mín. 6 caracteres)" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                        style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '9px 12px', color: '#f4f2f8', fontSize: 14, outline: 'none', fontFamily: "'Manrope',sans-serif" }}
                      />
                      <button onClick={savePassword} disabled={pwdSaving || !currentPwd || newPwd.length < 6}
                        style={{ background: AC, color: '#0a0612', fontWeight: 800, fontSize: 13.5, padding: '10px', borderRadius: 9, border: 'none', cursor: 'pointer', opacity: (pwdSaving || !currentPwd || newPwd.length < 6) ? .5 : 1 }}>
                        {pwdSaving ? 'Salvando...' : 'Confirmar alteração'}
                      </button>
                      {pwdMsg && <div style={{ fontSize: 12.5, color: pwdMsg.ok ? '#34d399' : '#f87171' }}>{pwdMsg.text}</div>}
                    </div>
                  )}
                </div>
              )}

              {/* sair */}
              <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 13.5, fontWeight: 700, padding: '4px 0', fontFamily: "'Manrope',sans-serif" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sair da conta
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}
