'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { onAuthStateChanged, User, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

const AC = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

function useInterval(cb: () => void, delay: number) {
  useEffect(() => {
    const id = setInterval(cb, delay)
    return () => clearInterval(id)
  })
}

export default function LandingPage() {
  const [ips, setIps] = useState(1492750)
  const [rps, setRps] = useState(1240)
  const [mm, setMm]   = useState(14)
  const [ss, setSs]   = useState(52)
  const [open, setOpen] = useState(-1)
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [profileOpen, setProfileOpen] = useState(false)
  const [modalOpen, setModalOpen]     = useState(false)
  const [modalTab, setModalTab]       = useState<'visao-geral'|'meu-plano'|'conta'>('conta')

  // profile modal form state
  const [editName, setEditName]     = useState(false)
  const [newName, setNewName]       = useState('')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg]       = useState<{text:string;ok:boolean}|null>(null)
  const [showPwd, setShowPwd]       = useState(false)
  const [curPwd, setCurPwd]         = useState('')
  const [nxtPwd, setNxtPwd]         = useState('')
  const [pwdSaving, setPwdSaving]   = useState(false)
  const [pwdMsg, setPwdMsg]         = useState<{text:string;ok:boolean}|null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u))
    return unsub
  }, [])

  useEffect(() => {
    if (!profileOpen) return
    const close = () => setProfileOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [profileOpen])

  useEffect(() => {
    document.body.style.overflow = modalOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [modalOpen])

  async function handleSignOut() {
    const { signOut } = await import('@/lib/firebase/auth-actions')
    await signOut()
    setUser(null)
    setProfileOpen(false)
    setModalOpen(false)
  }

  async function saveName() {
    if (!auth.currentUser || !newName.trim()) return
    setNameSaving(true)
    try {
      await updateProfile(auth.currentUser, { displayName: newName.trim() })
      setNameMsg({ text: 'Nome atualizado!', ok: true })
      setEditName(false)
    } catch { setNameMsg({ text: 'Erro ao salvar.', ok: false }) }
    finally { setNameSaving(false); setTimeout(() => setNameMsg(null), 3000) }
  }

  async function savePassword() {
    if (!auth.currentUser || !curPwd || nxtPwd.length < 6) return
    setPwdSaving(true)
    try {
      await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(user!.email!, curPwd))
      await updatePassword(auth.currentUser, nxtPwd)
      setPwdMsg({ text: 'Senha alterada!', ok: true })
      setShowPwd(false); setCurPwd(''); setNxtPwd('')
    } catch (e: unknown) {
      const code = (e as {code?:string}).code
      setPwdMsg({ text: code === 'auth/wrong-password' ? 'Senha atual incorreta.' : 'Erro ao alterar.', ok: false })
    }
    finally { setPwdSaving(false); setTimeout(() => setPwdMsg(null), 4000) }
  }

  useInterval(() => {
    setIps(v => v + Math.floor(Math.random() * 60) + 5)
    setRps(1160 + Math.floor(Math.random() * 220))
    setSs(prev => {
      if (prev > 0) return prev - 1
      setMm(m => { if (m > 0) return m - 1; return 14 })
      return 59
    })
  }, 1000)

  const fmt = (n: number) => n.toLocaleString('pt-BR')
  const pad = (n: number) => String(n).padStart(2, '0')
  const countdown = `${pad(mm)}:${pad(ss)}`

  const toggle = (i: number) => setOpen(o => o === i ? -1 : i)

  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: '#08070c', color: '#f4f2f8', fontFamily: "'Manrope',system-ui,sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      {/* ambient glows */}
      <div style={{ position: 'absolute', top: -280, left: '50%', transform: 'translateX(-50%)', width: 1100, height: 760, background: `radial-gradient(ellipse at center, color-mix(in srgb,${AC} 22%,transparent), transparent 68%)`, filter: 'blur(20px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: 1500, right: -200, width: 680, height: 680, background: `radial-gradient(circle, color-mix(in srgb,${AC} 16%,transparent), transparent 70%)`, filter: 'blur(30px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: 3000, left: -260, width: 680, height: 680, background: `radial-gradient(circle, color-mix(in srgb,${AC} 14%,transparent), transparent 70%)`, filter: 'blur(30px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* ANNOUNCE */}
        <div style={{ width: '100%', background: `linear-gradient(90deg, color-mix(in srgb,${AC} 22%,transparent), color-mix(in srgb,${AC} 8%,transparent))`, borderBottom: `1px solid color-mix(in srgb,${AC} 18%,transparent)`, textAlign: 'center', padding: '9px 16px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: '.12em', color: '#ece8f5' }}>
          <span style={{ color: AC2 }}>●</span>&nbsp;&nbsp;PIX · CARTÃO · CRYPTO — ativação em 30s, seu GB nunca expira&nbsp;&nbsp;<span style={{ color: AC2 }}>●</span>
        </div>

        {/* NAV */}
        <nav style={{ position: 'sticky', top: 14, zIndex: 40, maxWidth: 1180, margin: '18px auto 0', padding: '0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, background: 'rgba(16,14,22,.72)', backdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 18, padding: '12px 14px 12px 20px', boxShadow: '0 18px 50px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ display: 'inline-flex', filter: `drop-shadow(0 0 10px color-mix(in srgb,${AC} 70%,transparent))` }}>
                <svg width="30" height="30" viewBox="0 0 34 34" fill="none"><circle cx="17" cy="17" r="14.5" stroke={AC} strokeWidth="2" opacity=".35"/><path d="M17 2.5a14.5 14.5 0 0 1 0 29" stroke={AC2} strokeWidth="2.6" strokeLinecap="round"/><circle cx="17" cy="17" r="4.6" fill={AC}/></svg>
              </span>
              <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 19, letterSpacing: '-.02em' }}>LUMA<span style={{ color: AC2 }}> PROXIES</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 26, fontSize: 14, fontWeight: 600, color: 'rgba(244,242,248,.72)' }}>
              <a href="#produtos" style={{ color: 'inherit', textDecoration: 'none' }}>Produtos</a>
              <a href="#solucoes" style={{ color: 'inherit', textDecoration: 'none' }}>Soluções</a>
              <a href="#planos" style={{ color: 'inherit', textDecoration: 'none' }}>Preços</a>
              <a href="#comparar" style={{ color: 'inherit', textDecoration: 'none' }}>Comparar</a>
              <a href="#faq" style={{ color: 'inherit', textDecoration: 'none' }}>FAQ</a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {user === undefined ? null : user ? (
                <button onClick={() => { setModalTab('conta'); setModalOpen(true) }} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(168,85,247,.12)', border: `1px solid color-mix(in srgb,${AC} 30%,transparent)`, borderRadius: 999, padding: '7px 14px 7px 7px', cursor: 'pointer', color: '#f4f2f8', transition: 'background .15s' }}>
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: AC, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#0a0612', flexShrink: 0, overflow: 'hidden' }}>
                    {user.photoURL
                      ? <img src={user.photoURL} width={32} height={32} style={{ objectFit: 'cover', borderRadius: '50%' }} alt="" />
                      : (user.displayName || user.email || '?')[0].toUpperCase()}
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: .4 }}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                </button>
              ) : (
                <>
                  <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: 'rgba(244,242,248,.8)', textDecoration: 'none' }}>Entrar</Link>
                  <Link href="/cadastro" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 14, padding: '11px 18px', borderRadius: 12, textDecoration: 'none', boxShadow: `0 8px 28px color-mix(in srgb,${AC} 50%,transparent)` }}>
                    Começar agora
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* HERO */}
        <header style={{ maxWidth: 1180, margin: '0 auto', padding: '78px 20px 40px', display: 'grid', gridTemplateColumns: '1.08fr .92fr', gap: 48, alignItems: 'center' }}>
          <div style={{ animation: 'lumaRise .7s ease both' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: `1px solid color-mix(in srgb,${AC} 30%,transparent)`, background: `color-mix(in srgb,${AC} 10%,transparent)`, borderRadius: 999, padding: '7px 14px', fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '.16em', color: AC2, textTransform: 'uppercase' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>+90M IPs · Liberação automática
            </div>
            <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 62, lineHeight: .98, letterSpacing: '-.03em', margin: '22px 0 0' }}>
              Proxies<br />Premium <span style={{ color: AC }}>Residencial</span><br /><span style={{ color: AC }}>a partir de R$ 6,50<span style={{ color: '#f4f2f8' }}> /GB</span></span>
            </h1>
            <p style={{ fontSize: 17.5, lineHeight: 1.55, color: 'rgba(244,242,248,.6)', maxWidth: 480, margin: '22px 0 0' }}>Residencial, móvel e datacenter em <b style={{ color: '#f4f2f8' }}>+180 países</b>. Setup em segundos, pague só pelo que usar — <b style={{ color: '#f4f2f8' }}>sem mensalidade</b>.</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 13, marginTop: 30 }}>
              <Link href="/cadastro" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 15.5, padding: '15px 26px', borderRadius: 14, textDecoration: 'none', boxShadow: `0 12px 36px color-mix(in srgb,${AC} 48%,transparent)` }}>
                Comece agora <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
              </Link>
              <a href="#planos" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', color: '#f4f2f8', fontWeight: 700, fontSize: 15.5, padding: '15px 24px', borderRadius: 14, textDecoration: 'none' }}>Ver preços</a>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
              {[
                { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>, text: '90M+ IPs' },
                { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>, text: 'Setup fácil' },
                { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>, text: 'Pay-per-GB' },
                { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1v-7h3M3 19a2 2 0 0 0 2 2h1v-7H3"/></svg>, text: 'Suporte 24/7' },
              ].map(item => (
                <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,.09)', background: 'rgba(255,255,255,.025)', borderRadius: 11, padding: '10px 14px', fontSize: 13.5, fontWeight: 600, color: 'rgba(244,242,248,.82)' }}>
                  {item.icon}{item.text}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 26, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <span style={{ color: AC2, letterSpacing: 2 }}>★★★★★</span>
                <b style={{ color: '#f4f2f8' }}>4,9/5</b><span style={{ color: 'rgba(244,242,248,.45)' }}>· 2.300+ avaliações verificadas</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 13, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.13em', color: 'rgba(244,242,248,.5)', textTransform: 'uppercase' }}>
                <span>◇ ANTI-DETECÇÃO</span><span>⚡ ATIVAÇÃO 30S</span><span>↻ ROTAÇÃO AUTO</span><span>◈ PIX · CRYPTO · CARD</span>
              </div>
              <div style={{ marginTop: 13, paddingTop: 13, borderTop: '1px solid rgba(255,255,255,.06)', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.1em', color: 'rgba(244,242,248,.55)' }}>
                <span style={{ color: '#34d399' }}>●</span> 99.98% UPTIME — TODOS OS SISTEMAS OPERACIONAIS
              </div>
            </div>
          </div>

          {/* Globe animation */}
          <div style={{ animation: 'lumaRise .9s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.18em', color: AC2, textTransform: 'uppercase', marginBottom: 16 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', animation: 'lumaBlink 1.6s infinite', display: 'inline-block' }} />Rede global · ao vivo
            </div>
            <div style={{ position: 'relative', height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, color-mix(in srgb,${AC} 32%,transparent), transparent 65%)`, filter: 'blur(8px)', animation: 'lumaGlow 4s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', width: 330, height: 330, borderRadius: '50%', border: `1px solid color-mix(in srgb,${AC} 25%,transparent)`, animation: 'lumaSpin 24s linear infinite' }}>
                <span style={{ position: 'absolute', top: -4, left: '50%', width: 8, height: 8, borderRadius: '50%', background: AC2, boxShadow: `0 0 12px ${AC2}`, display: 'block' }} />
              </div>
              <div style={{ position: 'absolute', width: 250, height: 250, borderRadius: '50%', border: `1px dashed color-mix(in srgb,${AC} 28%,transparent)`, animation: 'lumaSpinR 18s linear infinite' }}>
                <span style={{ position: 'absolute', bottom: -3, left: '50%', width: 6, height: 6, borderRadius: '50%', background: AC, boxShadow: `0 0 10px ${AC}`, display: 'block' }} />
              </div>
              <div style={{ position: 'relative', width: 186, height: 186, borderRadius: '50%', background: 'radial-gradient(circle at 32% 28%, #1a1330, #0a0710 72%)', border: `1px solid color-mix(in srgb,${AC} 35%,transparent)`, boxShadow: `inset -16px -20px 50px rgba(0,0,0,.7), 0 0 60px color-mix(in srgb,${AC} 35%,transparent)`, overflow: 'hidden' }}>
                <svg width="186" height="186" viewBox="0 0 186 186" style={{ position: 'absolute', inset: 0, opacity: .6 }}>
                  <g stroke={`color-mix(in srgb,${AC} 55%,transparent)`} strokeWidth="1" fill="none" opacity=".7">
                    <ellipse cx="93" cy="93" rx="80" ry="30"/><ellipse cx="93" cy="93" rx="80" ry="58"/><ellipse cx="93" cy="93" rx="46" ry="80"/><ellipse cx="93" cy="93" rx="80" ry="80"/><line x1="13" y1="93" x2="173" y2="93"/>
                  </g>
                  <g fill={AC2}><circle cx="70" cy="60" r="2"/><circle cx="120" cy="78" r="2"/><circle cx="95" cy="120" r="2"/><circle cx="60" cy="110" r="2"/><circle cx="135" cy="115" r="2"/><circle cx="105" cy="48" r="2"/></g>
                </svg>
              </div>
              <svg width="360" height="360" viewBox="0 0 360 360" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <g stroke={AC2} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeDasharray="6 10" style={{ animation: 'lumaDash 6s linear infinite' }} opacity=".75">
                  <path d="M120 90 Q180 30 250 95"/><path d="M95 210 Q180 280 270 200"/><path d="M70 150 Q40 100 110 70"/>
                </g>
              </svg>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 11, marginTop: 14 }}>
              {[{ label: '◷ Países', val: '+180' }, { label: '∿ Latência', val: '39', unit: ' ms' }, { label: '⚷ Sucesso', val: '99,9', unit: '%' }].map(s => (
                <div key={s.label} style={{ border: '1px solid rgba(255,255,255,.09)', background: 'rgba(255,255,255,.025)', borderRadius: 13, padding: '13px 14px' }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '.14em', color: 'rgba(244,242,248,.45)', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 22 }}>{s.val}{s.unit && <span style={{ fontSize: 13, color: 'rgba(244,242,248,.5)' }}>{s.unit}</span>}</div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* MARQUEE */}
        <section style={{ marginTop: 34, borderTop: '1px solid rgba(255,255,255,.06)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '26px 0', background: 'rgba(255,255,255,.012)' }}>
          <div style={{ textAlign: 'center', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.22em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase', marginBottom: 20 }}>Compatível com casas de aposta, bots e antidetect</div>
          <div style={{ overflow: 'hidden', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)', maskImage: 'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)' }}>
            <div style={{ display: 'flex', gap: 14, width: 'max-content', animation: 'lumaMarquee 34s linear infinite' }}>
              {[1, 2].map(k => (
                <div key={k} style={{ display: 'flex', gap: 14 }} aria-hidden={k === 2}>
                  {['Selenium','Puppeteer','Playwright','AdsPower','Multilogin','GoLogin','Dolphin','Cassino','Apostas Esportivas'].map(t => (
                    <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: '1px solid rgba(255,255,255,.09)', background: 'rgba(255,255,255,.02)', borderRadius: 999, padding: '11px 18px', fontWeight: 700, fontSize: 14, color: 'rgba(244,242,248,.78)' }}>
                      <span style={{ color: AC2 }}>▢</span>{t}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHO IT'S FOR */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '96px 20px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.24em', color: AC2, textTransform: 'uppercase' }}>Para quem é</div>
            <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 46, lineHeight: 1.04, letterSpacing: '-.025em', margin: '14px 0 0' }}>Feito para quem <span style={{ color: AC }}>opera no limite.</span></h2>
            <p style={{ fontSize: 16.5, color: 'rgba(244,242,248,.55)', margin: '14px auto 0', maxWidth: 520 }}>Mais de 50.000 profissionais usam a Luma para escalar sem tomar bloqueio.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginTop: 46 }}>
            <div style={{ border: `1px solid color-mix(in srgb,${AC} 22%,transparent)`, background: `linear-gradient(180deg, color-mix(in srgb,${AC} 9%,transparent), rgba(255,255,255,.01))`, borderRadius: 18, padding: 26 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'inline-flex', width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb,${AC} 16%,transparent)`, color: AC2 }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="4"/></svg></span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '.14em', background: `color-mix(in srgb,${AC} 20%,transparent)`, color: AC2, padding: '5px 9px', borderRadius: 6 }}>MAIS USADO</span>
              </div>
              <h3 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 21, margin: '18px 0 8px' }}>Apostas & iGaming</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'rgba(244,242,248,.58)', margin: 0 }}>Acesse casas internacionais, surebet, multi-contas e arbitragem com IPs residenciais BR limpos. Zero bloqueios.</p>
            </div>
            <div style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: 26 }}>
              <span style={{ display: 'inline-flex', width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.05)', color: AC2 }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4M9 14h.01M15 14h.01"/></svg></span>
              <h3 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 21, margin: '18px 0 8px' }}>Bots & Automação</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'rgba(244,242,248,.58)', margin: 0 }}>Rode bots 24/7 com Selenium, Puppeteer, Playwright e AdsPower. Rotação automática e anti-detecção embutida.</p>
            </div>
            <div style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: 26 }}>
              <span style={{ display: 'inline-flex', width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.05)', color: AC2 }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 7-7M14 7h5v5"/></svg></span>
              <h3 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 21, margin: '18px 0 8px' }}>Gestores de Tráfego</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'rgba(244,242,248,.58)', margin: 0 }}>Escale campanhas de Meta e Google Ads sem bloqueios. IPs limpos, contas seguras e operação contínua.</p>
            </div>
          </div>
        </section>

        {/* PRODUCTS */}
        <section id="produtos" style={{ maxWidth: 1000, margin: '0 auto', padding: '96px 20px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.24em', color: AC2, textTransform: 'uppercase' }}>Nossos produtos</div>
            <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 46, lineHeight: 1.04, letterSpacing: '-.025em', margin: '14px 0 0' }}>Escolha seu <span style={{ color: AC }}>tipo de proxy.</span></h2>
            <p style={{ fontSize: 16.5, color: 'rgba(244,242,248,.55)', margin: '14px auto 0', maxWidth: 480 }}>Compare e configure em segundos. Pague com PIX, crypto ou cartão — sem mensalidade.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 42 }}>
            {[
              { name: 'Residenciais Rotativas', badge: 'MAIS VENDIDA', badgeBg: `color-mix(in srgb,${AC} 24%,transparent)`, badgeColor: '#fff', desc: 'IPs residenciais reais — rotação automática, +180 países.', price: 'R$ 6,50', unit: '/GB', primary: true },
              { name: 'Residenciais Fixas (Sticky)', badge: 'APOSTAS & SUREBET', badgeBg: 'rgba(52,211,153,.16)', badgeColor: '#34d399', desc: 'IP residencial fixo — ideal para apostas, surebet e multi-contas.', price: 'R$ 7,10', unit: '/GB', primary: false },
              { name: 'CPA Residencial Rotativa', badge: 'CPA SPEED', badgeBg: 'rgba(255,255,255,.06)', badgeColor: 'rgba(244,242,248,.7)', desc: 'Pool rotativo afinado para CPA e iGaming — pacotes 10/20/50/100/200 GB.', price: 'Oferta', unit: '', primary: false },
              { name: 'Mobile 4G/5G', badge: 'MAIS RÁPIDA', badgeBg: `color-mix(in srgb,${AC} 24%,transparent)`, badgeColor: '#fff', desc: 'IPs móveis reais 4G/5G de operadoras BR — anti-detecção máxima.', price: 'R$ 12,50', unit: '/GB', primary: false },
              { name: 'IPv4 Premium · IP Fixo', badge: 'ADS', badgeBg: 'rgba(255,255,255,.06)', badgeColor: 'rgba(244,242,248,.7)', desc: 'IPv4 dedicado para TikTok, Google, Meta, Instagram e YouTube Ads.', price: 'R$ 7,75', unit: '/un', primary: false },
              { name: 'Datacenter · IP Fixo', badge: 'ENTREGA IMEDIATA', badgeBg: 'rgba(255,255,255,.06)', badgeColor: 'rgba(244,242,248,.7)', desc: 'Alta velocidade e baixo custo para automações e tarefas em escala.', price: 'R$ 0,25', unit: '/un', primary: false },
            ].map(p => (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 18, border: p.primary ? `1px solid color-mix(in srgb,${AC} 22%,transparent)` : '1px solid rgba(255,255,255,.08)', background: p.primary ? `linear-gradient(90deg, color-mix(in srgb,${AC} 8%,transparent), rgba(255,255,255,.01))` : 'rgba(255,255,255,.02)', borderRadius: 16, padding: '20px 22px' }}>
                <span style={{ display: 'inline-flex', width: 48, height: 48, flexShrink: 0, borderRadius: 12, alignItems: 'center', justifyContent: 'center', background: p.primary ? `color-mix(in srgb,${AC} 18%,transparent)` : 'rgba(255,255,255,.05)', color: AC2 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 18, margin: 0 }}>{p.name}</h3>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.12em', background: p.badgeBg, color: p.badgeColor, padding: '4px 8px', borderRadius: 6 }}>{p.badge}</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: 'rgba(244,242,248,.55)', margin: '5px 0 0' }}>{p.desc}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.14em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase' }}>{p.unit ? 'A partir de' : 'Pacotes'}</div>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 21, color: AC }}>{p.price}{p.unit && <span style={{ fontSize: 12, color: 'rgba(244,242,248,.5)' }}>{p.unit}</span>}</div>
                </div>
                <Link href="/cadastro" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7, background: p.primary ? AC : 'rgba(255,255,255,.05)', border: p.primary ? 'none' : '1px solid rgba(255,255,255,.12)', color: p.primary ? '#0a0612' : '#f4f2f8', fontWeight: p.primary ? 800 : 700, fontSize: 13.5, padding: '11px 18px', borderRadius: 11, textDecoration: 'none', boxShadow: p.primary ? `0 8px 24px color-mix(in srgb,${AC} 40%,transparent)` : 'none' }}>
                  Ver planos <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* PRICING */}
        <section id="planos" style={{ maxWidth: 1180, margin: '0 auto', padding: '96px 20px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.24em', color: AC2, textTransform: 'uppercase' }}>Planos por GB · Residencial</div>
            <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 46, lineHeight: 1.04, letterSpacing: '-.025em', margin: '14px 0 0' }}>Pague só pelo que <span style={{ color: AC }}>usar.</span></h2>
            <p style={{ fontSize: 16.5, color: 'rgba(244,242,248,.55)', margin: '14px auto 0', maxWidth: 480 }}>Sem mensalidade. Seu GB nunca expira. Quanto mais GB, menor o preço.</p>
          </div>

          <div style={{ maxWidth: 760, margin: '30px auto 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', border: `1px solid color-mix(in srgb,${AC} 28%,transparent)`, background: `color-mix(in srgb,${AC} 9%,transparent)`, borderRadius: 14, padding: '14px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 14.5 }}>
              <span style={{ fontSize: 18 }}>🔥</span>
              <span>Oferta expira em <b style={{ color: AC2, fontFamily: "'JetBrains Mono',monospace" }}>{countdown}</b> — use o cupom <b style={{ color: '#fff' }}>LUMA10</b> e ganhe 10% off</span>
            </div>
            <button style={{ background: AC, color: '#0a0612', fontWeight: 800, fontSize: 13, padding: '9px 18px', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Aplicar cupom</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginTop: 34 }}>
            {[
              { gb: '1', price: 'R$ 9,90', highlight: false, badge: null },
              { gb: '5', price: 'R$ 42,90', highlight: false, badge: null },
              { gb: '10', price: 'R$ 79,90', highlight: true, badge: 'MAIS VENDIDO' },
              { gb: '20', price: 'R$ 149,90', highlight: false, badge: null },
              { gb: '100', price: 'R$ 699,90', highlight: false, badge: '+5 GB GRÁTIS' },
              { gb: '200', price: 'R$ 1.299,90', highlight: false, badge: null },
            ].map(p => (
              <div key={p.gb} style={{ position: 'relative', border: p.highlight ? `1.5px solid ${AC}` : '1px solid rgba(255,255,255,.08)', background: p.highlight ? `linear-gradient(180deg, color-mix(in srgb,${AC} 16%,transparent), rgba(255,255,255,.01))` : 'rgba(255,255,255,.02)', borderRadius: 15, padding: '20px 14px', textAlign: 'center', boxShadow: p.highlight ? `0 12px 40px color-mix(in srgb,${AC} 28%,transparent)` : 'none' }}>
                {p.badge && <span style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, letterSpacing: '.1em', background: p.highlight ? AC : 'rgba(52,211,153,.18)', color: p.highlight ? '#0a0612' : '#34d399', padding: '4px 9px', borderRadius: 6, whiteSpace: 'nowrap', fontWeight: 700 }}>{p.badge}</span>}
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.14em', color: p.highlight ? AC2 : 'rgba(244,242,248,.4)', textTransform: 'uppercase' }}>RES</div>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 28, margin: '8px 0 2px' }}>{p.gb} <span style={{ fontSize: 14, color: 'rgba(244,242,248,.5)' }}>GB</span></div>
                <div style={{ color: p.highlight ? '#fff' : AC, fontWeight: 800, fontSize: 15, marginTop: 6 }}>{p.price}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 26 }}>
            <Link href="/cadastro" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 15.5, padding: '15px 30px', borderRadius: 14, textDecoration: 'none', boxShadow: `0 12px 36px color-mix(in srgb,${AC} 44%,transparent)` }}>
              Criar minha proxy agora <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </Link>
          </div>
        </section>

        {/* WHY + LIVE STATS */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '96px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.24em', color: AC2, textTransform: 'uppercase' }}>Por que Luma</div>
            <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 42, lineHeight: 1.04, letterSpacing: '-.025em', margin: '14px 0 0' }}>Sua infra de proxies, <span style={{ color: AC }}>sem dor de cabeça.</span></h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(244,242,248,.58)', margin: '18px 0 0', maxWidth: 460 }}>A Luma é parceira de quem precisa de proxies residenciais de alta performance. Acesso a milhões de IPs reais, pagamento flexível, suporte humano e uma política justa: <b style={{ color: '#f4f2f8' }}>seu GB nunca expira.</b></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 28 }}>
              {['Alcance global em +180 países', 'Pague só pelo que usar — GB nunca expira', 'Ativação instantânea via PIX, crypto ou cartão', 'Suporte humano 24/7 em português'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ display: 'inline-flex', width: 26, height: 26, flexShrink: 0, borderRadius: '50%', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb,${AC} 22%,transparent)`, color: AC2, fontSize: 13 }}>✓</span>
                  <span style={{ fontSize: 15, color: 'rgba(244,242,248,.82)' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ border: `1px solid color-mix(in srgb,${AC} 20%,transparent)`, background: `linear-gradient(180deg, color-mix(in srgb,${AC} 8%,transparent), rgba(255,255,255,.01))`, borderRadius: 18, padding: 26 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.16em', color: 'rgba(244,242,248,.5)', textTransform: 'uppercase' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', animation: 'lumaBlink 1.5s infinite', display: 'inline-block' }} />IPs ativos agora
              </div>
              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 46, letterSpacing: '-.02em', marginTop: 10, color: '#fff' }}>{fmt(ips)}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: 24 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.16em', color: 'rgba(244,242,248,.5)', textTransform: 'uppercase' }}><span style={{ color: AC2 }}>∿</span> Req / seg</div>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 34, marginTop: 10 }}>{fmt(rps)}</div>
              </div>
              <div style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: 24 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.16em', color: 'rgba(244,242,248,.5)', textTransform: 'uppercase' }}><span style={{ color: AC2 }}>⚷</span> Uptime</div>
                <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 34, marginTop: 10 }}>99,98<span style={{ fontSize: 18, color: 'rgba(244,242,248,.5)' }}>%</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ maxWidth: 820, margin: '0 auto', padding: '96px 20px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.24em', color: AC2, textTransform: 'uppercase' }}>Dúvidas frequentes</div>
            <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 42, lineHeight: 1.05, letterSpacing: '-.025em', margin: '14px 0 0' }}>Perguntas <span style={{ color: AC }}>frequentes.</span></h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 38 }}>
            {[
              { q: 'O GB realmente nunca expira?', a: 'Sim. Diferente da maioria dos provedores, o saldo que você compra fica disponível na sua conta sem prazo de validade. Use no seu ritmo, sem perder nada.' },
              { q: 'Quais formas de pagamento vocês aceitam?', a: 'PIX (ativação instantânea), cartão de crédito e criptomoedas. O saldo é liberado automaticamente em segundos após a confirmação.' },
              { q: 'As proxies funcionam com AdsPower, Multilogin e bots?', a: 'Sim. Suportamos HTTP e SOCKS5, totalmente compatíveis com AdsPower, Multilogin, GoLogin, Dolphin, Selenium, Puppeteer e Playwright, sem vazamento de fingerprint.' },
              { q: 'Posso escolher cidade/estado no Brasil?', a: 'Sim. Oferecemos geo-targeting por país e, no Brasil, segmentação por estado (SP, RJ, MG e outros) nos planos residenciais.' },
              { q: 'Qual a diferença entre IP rotativo e fixo?', a: 'O rotativo troca de IP a cada conexão (ideal para scraping e CPA). O fixo (sticky) mantém o mesmo IP por sessão, perfeito para apostas, surebet e multi-contas.' },
              { q: 'Tem suporte em português?', a: 'Sim, suporte humano 24/7 em português e inglês, via WhatsApp e chat ao vivo. Resposta média em poucos minutos.' },
            ].map((f, i) => (
              <div key={i} style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 14, overflow: 'hidden' }}>
                <button onClick={() => toggle(i)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, background: 'none', border: 'none', color: '#f4f2f8', fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 16, textAlign: 'left', padding: '20px 22px', cursor: 'pointer' }}>
                  {f.q}<span style={{ color: AC2, fontSize: 22, flexShrink: 0 }}>{open === i ? '−' : '+'}</span>
                </button>
                {open === i && <div style={{ padding: '0 22px 20px', fontSize: 14.5, lineHeight: 1.6, color: 'rgba(244,242,248,.6)' }}>{f.a}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '96px 20px 90px' }}>
          <div style={{ position: 'relative', overflow: 'hidden', border: `1px solid color-mix(in srgb,${AC} 30%,transparent)`, borderRadius: 26, background: `linear-gradient(135deg, color-mix(in srgb,${AC} 16%,transparent), rgba(255,255,255,.01))`, padding: '62px 40px', textAlign: 'center' }}>
            <div style={{ position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)', width: 560, height: 360, background: `radial-gradient(ellipse at center, color-mix(in srgb,${AC} 32%,transparent), transparent 70%)`, filter: 'blur(14px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 48, lineHeight: 1.02, letterSpacing: '-.03em', margin: 0 }}>Comece a escalar<br />com a <span style={{ color: AC }}>Luma</span> hoje.</h2>
              <p style={{ fontSize: 17, color: 'rgba(244,242,248,.6)', margin: '18px auto 0', maxWidth: 460 }}>Ative em 30 segundos. Sem mensalidade, sem fidelidade — só performance.</p>
              <div style={{ display: 'flex', gap: 13, justifyContent: 'center', flexWrap: 'wrap', marginTop: 30 }}>
                <Link href="/cadastro" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 16, padding: '16px 30px', borderRadius: 14, textDecoration: 'none', boxShadow: `0 14px 40px color-mix(in srgb,${AC} 48%,transparent)` }}>
                  Comece agora <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </Link>
                <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.14)', color: '#f4f2f8', fontWeight: 700, fontSize: 16, padding: '16px 26px', borderRadius: 14, textDecoration: 'none' }}>Falar com vendas</a>
              </div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginTop: 26, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.12em', color: 'rgba(244,242,248,.45)', textTransform: 'uppercase' }}>
                <span>⚡ Ativação 30s</span><span>↺ Garantia 7 dias</span><span>◷ +2.000 clientes ativos</span>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,.07)', background: 'rgba(0,0,0,.3)' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: '54px 20px 30px', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 36 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="26" height="26" viewBox="0 0 34 34" fill="none"><circle cx="17" cy="17" r="14.5" stroke={AC} strokeWidth="2" opacity=".35"/><path d="M17 2.5a14.5 14.5 0 0 1 0 29" stroke={AC2} strokeWidth="2.6" strokeLinecap="round"/><circle cx="17" cy="17" r="4.6" fill={AC}/></svg>
                <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 17 }}>LUMA<span style={{ color: AC2 }}> PROXIES</span></span>
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'rgba(244,242,248,.5)', margin: '14px 0 0', maxWidth: 280 }}>Proxies residenciais, móveis e datacenter premium no Brasil e em +180 países. Setup em segundos.</p>
            </div>
            {[
              { title: 'Produtos', links: ['Residencial', 'Mobile 4G/5G', 'Datacenter', 'IPv4 Premium'] },
              { title: 'Empresa', links: ['Afiliados', 'FAQ', 'Suporte', 'Termos'] },
              { title: 'Contato', links: ['WhatsApp', 'Telegram', 'Instagram', 'E-mail'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.16em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase', marginBottom: 14 }}>{col.title}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
                  {col.links.map(l => <a key={l} href="#" style={{ color: 'rgba(244,242,248,.65)', textDecoration: 'none' }}>{l}</a>)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ maxWidth: 1180, margin: '0 auto', padding: 20, borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, fontSize: 12.5, color: 'rgba(244,242,248,.4)' }}>
            <span>© 2026 Luma Proxies. Todos os direitos reservados.</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.08em' }}><span style={{ color: '#34d399' }}>●</span> Todos os sistemas operacionais</span>
          </div>
        </footer>

      </div>

      {/* ── PROFILE MODAL ── */}
      {modalOpen && user && (() => {
        const name    = user.displayName || user.email?.split('@')[0] || 'Usuário'
        const email   = user.email ?? ''
        const initial = name[0]?.toUpperCase() ?? 'U'
        const memberSince = user.metadata?.creationTime
          ? new Date(user.metadata.creationTime).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
          : '—'

        const tabSt = (t: typeof modalTab): React.CSSProperties => ({
          fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.14em',
          textTransform: 'uppercase', fontWeight: 700, padding: '11px 16px',
          border: 'none', background: 'none', cursor: 'pointer',
          color: modalTab === t ? '#f4f2f8' : 'rgba(244,242,248,.35)',
          borderBottom: modalTab === t ? `2px solid ${AC}` : '2px solid transparent',
        })

        const field = (label: string, value: React.ReactNode) => (
          <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 13, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px 3px', fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '.14em', color: 'rgba(244,242,248,.32)', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ padding: '2px 16px 13px' }}>{value}</div>
          </div>
        )

        return (
          <div onClick={() => setModalOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#0f0d18', border: '1px solid rgba(255,255,255,.1)', borderRadius: 22, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,.8)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

              {/* header */}
              <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${AC2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#0a0612', flexShrink: 0, boxShadow: `0 0 0 3px rgba(168,85,247,.2)` }}>
                  {user.photoURL ? <img src={user.photoURL} width={56} height={56} style={{ borderRadius: '50%', objectFit: 'cover' }} alt="" /> : initial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 18, color: '#f4f2f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(244,242,248,.4)', marginTop: 2 }}>{email}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.18)', borderRadius: 999, padding: '3px 9px', fontSize: 10.5, fontWeight: 700, color: '#34d399', fontFamily: "'JetBrains Mono',monospace" }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />Conta ativa
                  </div>
                </div>
                <button onClick={() => setModalOpen(false)} style={{ background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(244,242,248,.5)', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {/* tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.07)', flexShrink: 0 }}>
                <button style={tabSt('visao-geral')} onClick={() => setModalTab('visao-geral')}>Visão geral</button>
                <button style={tabSt('meu-plano')}   onClick={() => setModalTab('meu-plano')}>Meu plano</button>
                <button style={tabSt('conta')}        onClick={() => setModalTab('conta')}>Conta</button>
              </div>

              {/* content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

                {/* VISÃO GERAL */}
                {modalTab === 'visao-geral' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { label: 'Proxies ativas', val: '—', color: AC },
                      { label: 'GB consumidos (30d)', val: '—', color: '#f4f2f8' },
                      { label: 'GB disponíveis', val: '—', color: '#34d399' },
                      { label: 'Pedidos realizados', val: '—', color: '#f4f2f8' },
                    ].map(s => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '13px 16px' }}>
                        <span style={{ fontSize: 13.5, color: 'rgba(244,242,248,.55)' }}>{s.label}</span>
                        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 18, color: s.color }}>{s.val}</span>
                      </div>
                    ))}
                    <Link href="/dashboard" onClick={() => setModalOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 14, padding: '13px', borderRadius: 12, textDecoration: 'none', marginTop: 4, boxShadow: `0 8px 24px color-mix(in srgb,${AC} 40%,transparent)` }}>
                      Ir para o dashboard <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </Link>
                  </div>
                )}

                {/* MEU PLANO */}
                {modalTab === 'meu-plano' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ border: `1px solid color-mix(in srgb,${AC} 22%,transparent)`, borderRadius: 14, padding: '18px 20px', background: `color-mix(in srgb,${AC} 8%,transparent)` }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.14em', color: AC2, textTransform: 'uppercase' }}>Plano atual</div>
                      <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 24, marginTop: 6 }}>Free</div>
                      <div style={{ fontSize: 13, color: 'rgba(244,242,248,.5)', marginTop: 4 }}>Sem GB ativo. Adicione saldo para começar.</div>
                    </div>
                    {[['Tipo de proxy','—'],['GB ativo','0 GB'],['Validade','Não expira'],['Região padrão','Brasil']].map(([k,v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,.07)', borderRadius: 11, padding: '12px 16px', fontSize: 13.5 }}>
                        <span style={{ color: 'rgba(244,242,248,.5)' }}>{k}</span>
                        <span style={{ fontWeight: 700, color: '#f4f2f8' }}>{v}</span>
                      </div>
                    ))}
                    <Link href="/dashboard/recarga" onClick={() => setModalOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 14, padding: '13px', borderRadius: 12, textDecoration: 'none', boxShadow: `0 8px 24px color-mix(in srgb,${AC} 40%,transparent)` }}>
                      Recarregar saldo <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </Link>
                  </div>
                )}

                {/* CONTA */}
                {modalTab === 'conta' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {field('Nome de usuário',
                      editName ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                          <input autoFocus defaultValue={name} onChange={e => setNewName(e.target.value)}
                            style={{ flex: 1, background: 'rgba(255,255,255,.05)', border: `1px solid color-mix(in srgb,${AC} 40%,transparent)`, borderRadius: 8, padding: '8px 11px', color: '#f4f2f8', fontSize: 14, outline: 'none', fontFamily: "'Manrope',sans-serif" }} />
                          <button onClick={saveName} disabled={nameSaving} style={{ background: AC, color: '#0a0612', fontWeight: 700, fontSize: 12.5, padding: '8px 13px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>{nameSaving ? '...' : 'Salvar'}</button>
                          <button onClick={() => setEditName(false)} style={{ background: 'rgba(255,255,255,.06)', color: 'rgba(244,242,248,.6)', fontSize: 12.5, padding: '8px 11px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>×</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 14.5, fontWeight: 600, color: '#f4f2f8' }}>{name}</span>
                          <button onClick={() => { setEditName(true); setNewName(name) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: AC2, display: 'flex' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                          </button>
                        </div>
                      )
                    )}
                    {nameMsg && <div style={{ fontSize: 12, color: nameMsg.ok ? '#34d399' : '#f87171', marginTop: -6 }}>{nameMsg.text}</div>}

                    {field('E-mail', <span style={{ fontSize: 14.5, color: 'rgba(244,242,248,.65)' }}>{email}</span>)}

                    {field('Membro desde', <span style={{ fontSize: 14.5, color: 'rgba(244,242,248,.65)', textTransform: 'capitalize' }}>{memberSince}</span>)}

                    {field('Senha',
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 15, color: 'rgba(244,242,248,.35)', letterSpacing: 4 }}>••••••••</span>
                          <button onClick={() => setShowPwd(s => !s)} style={{ background: 'none', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, padding: '5px 11px', color: 'rgba(244,242,248,.65)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.08em' }}>
                            {showPwd ? 'CANCELAR' : 'ALTERAR'}
                          </button>
                        </div>
                        {showPwd && (
                          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                            <input type="password" placeholder="Senha atual" value={curPwd} onChange={e => setCurPwd(e.target.value)}
                              style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '9px 12px', color: '#f4f2f8', fontSize: 13.5, outline: 'none', fontFamily: "'Manrope',sans-serif" }} />
                            <input type="password" placeholder="Nova senha (mín. 6 caracteres)" value={nxtPwd} onChange={e => setNxtPwd(e.target.value)}
                              style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '9px 12px', color: '#f4f2f8', fontSize: 13.5, outline: 'none', fontFamily: "'Manrope',sans-serif" }} />
                            <button onClick={savePassword} disabled={pwdSaving || !curPwd || nxtPwd.length < 6}
                              style={{ background: AC, color: '#0a0612', fontWeight: 800, fontSize: 13.5, padding: '10px', borderRadius: 9, border: 'none', cursor: 'pointer', opacity: (pwdSaving || !curPwd || nxtPwd.length < 6) ? .5 : 1 }}>
                              {pwdSaving ? 'Salvando...' : 'Confirmar'}
                            </button>
                            {pwdMsg && <div style={{ fontSize: 12, color: pwdMsg.ok ? '#34d399' : '#f87171' }}>{pwdMsg.text}</div>}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '4px 0' }} />

                    <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 13.5, fontWeight: 700, padding: '2px 0', fontFamily: "'Manrope',sans-serif" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Sair da conta
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
