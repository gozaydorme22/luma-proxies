'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { signOut } from '@/lib/firebase/auth-actions'
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

const AC  = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

type Tab = 'visao-geral' | 'meu-plano' | 'conta'

interface ProxyInfo {
  id: string
  name: string
  host: string
  port: number
  proxyUser: string
  proxyPass: string
  status: 'ativa' | 'suspensa' | 'inativa'
  totalGb: number
  usedGb: number
}

export default function PerfilPage() {
  const { user } = useAuth()
  const router   = useRouter()

  const [tab, setTab]           = useState<Tab>('conta')
  const [editName, setEditName] = useState(false)
  const [newName, setNewName]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null)

  const [showPwd, setShowPwd]       = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd]         = useState('')
  const [pwdMsg, setPwdMsg]         = useState<{ text: string; ok: boolean } | null>(null)
  const [pwdSaving, setPwdSaving]   = useState(false)

  const [proxies, setProxies]         = useState<ProxyInfo[]>([])
  const [activeCount, setActiveCount] = useState<number | null>(null)
  const [ordersCount, setOrdersCount] = useState<number | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [copiedId, setCopiedId]       = useState<string | null>(null)
  const [checkerMap, setCheckerMap]   = useState<Record<string, boolean>>({})
  const [removing, setRemoving]       = useState<string | null>(null)

  const email   = user?.email ?? ''
  const name    = user?.displayName || email.split('@')[0]
  const initial = name[0]?.toUpperCase() ?? 'U'

  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '—'

  useEffect(() => {
    async function loadData() {
      setDataLoading(true)
      try {
        const [proxRes, orderRes] = await Promise.all([
          fetch('/api/proxies'),
          fetch('/api/pedidos'),
        ])
        const proxJson  = proxRes.ok  ? await proxRes.json()  : { proxies: [] }
        const orderJson = orderRes.ok ? await orderRes.json() : { orders: [] }

        const myProxies: ProxyInfo[] = proxJson.proxies ?? []
        setProxies(myProxies)
        setOrdersCount((orderJson.orders ?? []).length)

        const toCheck = myProxies.filter(p => p.status === 'ativa')
        if (toCheck.length === 0) {
          setActiveCount(0)
          return
        }

        const checkRes = await fetch('/api/proxy-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proxies: toCheck.map(p => `${p.host}:${p.port}:${p.proxyUser}:${p.proxyPass}`),
          }),
        })
        if (checkRes.ok) {
          const results: Array<{ status: string }> = await checkRes.json()
          const map: Record<string, boolean> = {}
          toCheck.forEach((p, i) => { map[p.id] = results[i]?.status === 'success' })
          setCheckerMap(map)
          setActiveCount(Object.values(map).filter(Boolean).length)
        } else {
          setActiveCount(toCheck.length)
        }
      } catch {
        setActiveCount(null)
        setOrdersCount(null)
      } finally {
        setDataLoading(false)
      }
    }
    loadData()
  }, [])

  async function saveName() {
    if (!auth.currentUser || !newName.trim()) return
    setSaving(true)
    try {
      await updateProfile(auth.currentUser, { displayName: newName.trim() })
      await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
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

  function copyCredentials(proxy: ProxyInfo) {
    const str = `${proxy.host}:${proxy.port}:${proxy.proxyUser}:${proxy.proxyPass}`
    navigator.clipboard.writeText(str).then(() => {
      setCopiedId(proxy.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
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
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${AC2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 600, color: '#0a0612', boxShadow: `0 0 0 3px rgba(168,85,247,.25), 0 8px 24px rgba(0,0,0,.5)` }}>
            {user?.photoURL
              ? <img src={user.photoURL} width={72} height={72} style={{ borderRadius: '50%', objectFit: 'cover' }} alt="" />
              : initial}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 17, color: '#f4f2f8' }}>{name}</div>
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
                { label: 'Proxys ativas', value: dataLoading ? '...' : activeCount !== null ? String(activeCount) : '—', color: AC },
                { label: 'Pedidos realizados', value: dataLoading ? '...' : ordersCount !== null ? String(ordersCount) : '—', color: '#f4f2f8' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '14px 18px' }}>
                  <span style={{ fontSize: 13.5, color: 'rgba(244,242,248,.6)' }}>{s.label}</span>
                  <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 500, fontSize: 15, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── MEU PLANO ── */}
          {tab === 'meu-plano' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {dataLoading ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(244,242,248,.35)', fontSize: 13 }}>Carregando proxies...</div>
              ) : proxies.length === 0 ? (
                <>
                  <div style={{ border: `1px solid rgba(168,85,247,.2)`, borderRadius: 14, padding: '18px 20px', background: 'rgba(168,85,247,.06)' }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.14em', color: AC2, textTransform: 'uppercase' }}>Plano atual</div>
                    <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 18, marginTop: 6 }}>Sem proxies</div>
                    <div style={{ fontSize: 13, color: 'rgba(244,242,248,.5)', marginTop: 4 }}>Nenhuma proxy atribuída à sua conta ainda.</div>
                  </div>
                  <a href="?checkout=1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 14, padding: '13px 20px', borderRadius: 12, textDecoration: 'none', boxShadow: `0 8px 24px color-mix(in srgb,${AC} 40%,transparent)` }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                    Comprar proxies
                  </a>
                </>
              ) : (
                proxies.map((proxy) => {
                  const connStr    = `${proxy.host}:${proxy.port}:${proxy.proxyUser}:${proxy.proxyPass}`
                  const isCopied   = copiedId === proxy.id
                  const checkerDone = proxy.id in checkerMap
                  const isAlive    = checkerDone ? checkerMap[proxy.id] : proxy.status === 'ativa'
                  const isRemoving = removing === proxy.id
                  const pct        = proxy.totalGb > 0 ? Math.min(100, Math.round((proxy.usedGb / proxy.totalGb) * 100)) : 0
                  const barColor   = pct >= 95 ? '#f87171' : pct >= 75 ? '#fbbf24' : '#34d399'
                  return (
                    <div key={proxy.id} style={{ border: `1px solid color-mix(in srgb,${isAlive ? AC : '#f87171'} 20%,rgba(255,255,255,.06))`, borderRadius: 16, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', background: `color-mix(in srgb,${isAlive ? AC : '#f87171'} 5%,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 14, color: '#f4f2f8' }}>{proxy.name || proxy.host}</div>
                          <div style={{ fontSize: 11.5, color: 'rgba(244,242,248,.45)', marginTop: 2 }}>Proxy Residencial Rotativa</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: isAlive ? 'rgba(52,211,153,.12)' : 'rgba(248,113,113,.1)', border: `1px solid ${isAlive ? 'rgba(52,211,153,.25)' : 'rgba(248,113,113,.2)'}`, borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: isAlive ? '#34d399' : '#f87171', fontFamily: "'JetBrains Mono',monospace" }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: isAlive ? '#34d399' : '#f87171', display: 'inline-block' }} />
                            {checkerDone ? (isAlive ? 'ativa' : 'inativa') : proxy.status}
                          </div>
                          {checkerDone && !isAlive && (
                            <button
                              disabled={isRemoving}
                              onClick={async () => {
                                if (!confirm('Remover esta proxy inativa?')) return
                                setRemoving(proxy.id)
                                try {
                                  const r = await fetch(`/api/proxies/${proxy.id}`, { method: 'DELETE' })
                                  if (r.ok) setProxies(prev => prev.filter(p => p.id !== proxy.id))
                                  else { const d = await r.json(); alert(d.error ?? 'Erro ao remover.') }
                                } finally { setRemoving(null) }
                              }}
                              style={{ background: 'rgba(248,113,113,.15)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 8, padding: '5px 10px', color: '#f87171', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", opacity: isRemoving ? .5 : 1 }}
                            >
                              {isRemoving ? '...' : 'Remover'}
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(244,242,248,.4)', marginBottom: 6 }}>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.1em', textTransform: 'uppercase', fontSize: 10 }}>Uso de GB</span>
                          <span>{proxy.usedGb.toFixed(2)} / {proxy.totalGb} GB</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,.07)', overflow: 'hidden', marginBottom: 4 }}>
                          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: `linear-gradient(90deg,${barColor},${barColor}aa)`, transition: 'width .4s ease' }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(244,242,248,.35)', textAlign: 'right' }}>{pct}% usado</div>
                      </div>
                      <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.14em', color: 'rgba(244,242,248,.35)', textTransform: 'uppercase', marginBottom: 8 }}>Credenciais de conexão</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div style={{ flex: 1, background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '10px 14px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'rgba(244,242,248,.75)', wordBreak: 'break-all', lineHeight: 1.5 }}>
                            {connStr}
                          </div>
                          <button
                            onClick={() => copyCredentials(proxy)}
                            style={{ flexShrink: 0, background: isCopied ? 'rgba(52,211,153,.15)' : 'rgba(168,85,247,.15)', border: `1px solid ${isCopied ? 'rgba(52,211,153,.3)' : 'rgba(168,85,247,.3)'}`, borderRadius: 10, padding: '10px 14px', color: isCopied ? '#34d399' : AC, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", transition: 'all .2s', whiteSpace: 'nowrap' }}>
                            {isCopied ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {[['Host', proxy.host], ['Porta', String(proxy.port)], ['Usuário', proxy.proxyUser], ['Senha', proxy.proxyPass]].map(([k, v]) => (
                            <div key={k} style={{ background: 'rgba(0,0,0,.2)', borderRadius: 8, padding: '8px 12px' }}>
                              <div style={{ fontSize: 10, color: 'rgba(244,242,248,.3)', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
                              <div style={{ fontSize: 12, color: '#f4f2f8', fontFamily: "'JetBrains Mono',monospace", wordBreak: 'break-all' }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ── CONTA ── */}
          {tab === 'conta' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

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

              {field('E-mail', <span style={{ fontSize: 15, color: 'rgba(244,242,248,.7)' }}>{email}</span>)}

              {field('Foto de perfil',
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${AC2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#0a0612', flexShrink: 0 }}>
                    {user?.photoURL ? <img src={user.photoURL} width={38} height={38} style={{ borderRadius: '50%', objectFit: 'cover' }} alt="" /> : initial}
                  </div>
                  <span style={{ fontSize: 13.5, color: 'rgba(244,242,248,.4)', fontStyle: 'italic' }}>Em breve</span>
                </div>
              )}

              {field('Membro desde', <span style={{ fontSize: 15, color: 'rgba(244,242,248,.7)', textTransform: 'capitalize' }}>{memberSince}</span>)}

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
