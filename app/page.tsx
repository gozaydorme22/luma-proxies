'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { onAuthStateChanged, User, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { WorldMap } from '@/components/WorldMap'
import { CheckoutModal } from '@/components/CheckoutModal'

const AC = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

function useInterval(cb: () => void, delay: number) {
  useEffect(() => {
    const id = setInterval(cb, delay)
    return () => clearInterval(id)
  })
}

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } },
      { threshold: 0.08 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.65s cubic-bezier(.22,1,.36,1) ${delay}ms, transform 0.65s cubic-bezier(.22,1,.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

export default function LandingPage() {
  const [ips, setIps] = useState(1492750)
  const [rps, setRps] = useState(1240)
  const [open, setOpen] = useState(-1)
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [modalOpen, setModalOpen]     = useState(false)
  const [modalTab, setModalTab]       = useState<'visao-geral'|'meu-plano'|'conta'>('conta')

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
    document.body.style.overflow = modalOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [modalOpen])

  async function handleSignOut() {
    const { signOut } = await import('@/lib/firebase/auth-actions')
    await signOut()
    setUser(null)
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
  }, 1000)

  const fmt = (n: number) => n.toLocaleString('pt-BR')
  const toggle = (i: number) => setOpen(o => o === i ? -1 : i)

  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null)

  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const [couponEligible, setCouponEligible] = useState<boolean | null>(null)
  useEffect(() => {
    if (!user) return
    fetch('/api/coupon/status')
      .then(r => r.json())
      .then(d => setCouponEligible(d.eligible))
      .catch(() => setCouponEligible(false))
  }, [user])

  // Show for logged-out users (incentive to sign up) and logged-in eligible users
  const showCouponBanner = user === null || couponEligible === true

  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: '#08070c', color: '#f4f2f8', fontFamily: "'Manrope',system-ui,sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      {/* ambient glows */}
      <div style={{ position: 'absolute', top: -280, left: '50%', transform: 'translateX(-50%)', width: 1100, height: 760, background: `radial-gradient(ellipse at center, color-mix(in srgb,${AC} 22%,transparent), transparent 68%)`, filter: 'blur(20px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: 1500, right: -200, width: 680, height: 680, background: `radial-gradient(circle, color-mix(in srgb,${AC} 16%,transparent), transparent 70%)`, filter: 'blur(30px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: 3000, left: -260, width: 680, height: 680, background: `radial-gradient(circle, color-mix(in srgb,${AC} 14%,transparent), transparent 70%)`, filter: 'blur(30px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Fixed header: announce banner + nav */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>


        {/* NAV — full-width glassmorphism, sem pill */}
        <nav style={{ width: '100%', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', background: scrolled ? 'rgba(8,7,12,.92)' : 'rgba(8,7,12,.78)', borderBottom: '1px solid rgba(255,255,255,.07)', boxShadow: scrolled ? '0 4px 28px rgba(0,0,0,.4)' : '0 4px 28px rgba(0,0,0,0)', transition: 'background .25s ease, box-shadow .25s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, maxWidth: 1180, margin: '0 auto', padding: '13px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ display: 'inline-flex', filter: `drop-shadow(0 0 10px color-mix(in srgb,${AC} 70%,transparent))` }}>
                <svg width="30" height="30" viewBox="0 0 34 34" fill="none"><circle cx="17" cy="17" r="14.5" stroke={AC} strokeWidth="2" opacity=".35"/><path d="M17 2.5a14.5 14.5 0 0 1 0 29" stroke={AC2} strokeWidth="2.6" strokeLinecap="round"/><circle cx="17" cy="17" r="4.6" fill={AC}/></svg>
              </span>
              <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 19, letterSpacing: '-.02em' }}>LUMA<span style={{ color: AC2 }}> PROXIES</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 26, fontSize: 14, fontWeight: 600, color: 'rgba(244,242,248,.72)' }}>
              <a href="#como-funciona" style={{ color: 'inherit', textDecoration: 'none' }}>Como funciona</a>
              <a href="#planos" style={{ color: 'inherit', textDecoration: 'none' }}>Preços</a>
              <a href="#faq" style={{ color: 'inherit', textDecoration: 'none' }}>FAQ</a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {user === undefined ? null : user ? (
                <button onClick={() => { setModalTab('visao-geral'); setModalOpen(true) }} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(168,85,247,.12)', border: `1px solid color-mix(in srgb,${AC} 30%,transparent)`, borderRadius: 999, padding: '7px 14px 7px 7px', cursor: 'pointer', color: '#f4f2f8', transition: 'background .15s' }}>
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
      </div>

      <div style={{ position: 'relative', zIndex: 2, paddingTop: 60 }}>

        {/* HERO */}
        <header style={{ maxWidth: 1180, margin: '0 auto', padding: '78px 20px 40px', display: 'grid', gridTemplateColumns: '1.08fr .92fr', gap: 48, alignItems: 'start' }}>
          <div style={{ animation: 'lumaRise .7s ease both', textAlign: 'left' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: `1px solid color-mix(in srgb,${AC} 30%,transparent)`, background: `color-mix(in srgb,${AC} 10%,transparent)`, borderRadius: 999, padding: '7px 14px', fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '.16em', color: AC2, textTransform: 'uppercase' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399', display: 'inline-block', animation: 'lumaBlink 1.4s infinite' }} />IPs Residenciais Reais · Rotação Automática
            </div>
            <h1 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 54, lineHeight: 1.0, letterSpacing: '-.025em', margin: '22px 0 0', textAlign: 'left' }}>
              Proxy <span style={{ color: AC }}>Residencial</span><br /><span style={{ color: AC }}>Rotativa</span> Premium
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.65, color: 'rgba(244,242,248,.6)', maxWidth: 480, margin: '22px 0 0' }}>IPs residenciais reais com rotação automática. Pague só pelo que usar, acompanhe o consumo <b style={{ color: '#f4f2f8' }}>em tempo real</b>.</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 13, marginTop: 30 }}>
              {user ? (
                <button onClick={() => setCheckoutPlan('5')} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 15.5, padding: '15px 26px', borderRadius: 14, border: 'none', cursor: 'pointer', boxShadow: `0 12px 36px color-mix(in srgb,${AC} 48%,transparent)`, fontFamily: "'Manrope',sans-serif" }}>
                  Comece agora <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </button>
              ) : (
                <Link href="/cadastro" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 15.5, padding: '15px 26px', borderRadius: 14, textDecoration: 'none', boxShadow: `0 12px 36px color-mix(in srgb,${AC} 48%,transparent)` }}>
                  Comece agora <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </Link>
              )}
              <a href="#planos" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', color: '#f4f2f8', fontWeight: 700, fontSize: 15.5, padding: '15px 24px', borderRadius: 14, textDecoration: 'none' }}>Ver preços</a>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
              {[
                { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>, text: '90M+ IPs reais' },
                { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>, text: 'Rotação automática' },
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

          {/* DOT MAP */}
          <div style={{ animation: 'lumaRise .9s ease both', paddingTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.14em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase', marginBottom: 14 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'lumaBlink 1.6s infinite', display: 'inline-block' }} />
              Cobertura global · +180 países
            </div>
            <div style={{ width: '100%', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, background: 'rgba(255,255,255,.018)', padding: '20px 16px 14px', overflow: 'hidden' }}>
              <WorldMap />
            </div>
          </div>

        </header>

        {/* MARQUEE */}
        <Reveal>
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
        </Reveal>

        {/* WHO IT'S FOR */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '96px 20px 0' }}>
          <Reveal>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.14em', color: AC2, textTransform: 'uppercase' }}>Para quem é</div>
              <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 40, lineHeight: 1.06, letterSpacing: '-.02em', margin: '14px 0 0' }}>Feito para quem <span style={{ color: AC }}>opera no limite.</span></h2>
              <p style={{ fontSize: 16.5, color: 'rgba(244,242,248,.55)', margin: '14px auto 0', maxWidth: 520 }}>Mais de 50.000 profissionais usam a Luma para escalar sem tomar bloqueio.</p>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginTop: 46 }}>
            {[
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="4"/></svg>,
                badge: 'MAIS USADO', title: 'Apostas & iGaming',
                desc: 'Acesse casas internacionais, surebet, multi-contas e arbitragem com IPs residenciais BR limpos. Zero bloqueios.',
                primary: true,
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4M9 14h.01M15 14h.01"/></svg>,
                badge: null, title: 'Bots & Automação',
                desc: 'Rode bots 24/7 com Selenium, Puppeteer, Playwright e AdsPower. Rotação automática e anti-detecção embutida.',
                primary: false,
              },
              {
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 7-7M14 7h5v5"/></svg>,
                badge: null, title: 'CPA & Gestores de Tráfego',
                desc: 'Escale campanhas de Meta e Google Ads sem bloqueios. IPs residenciais limpos, contas seguras e operação contínua.',
                primary: false,
              },
            ].map((card, i) => (
              <Reveal key={card.title} delay={i * 100}>
                <div style={{ border: card.primary ? `1px solid color-mix(in srgb,${AC} 22%,transparent)` : '1px solid rgba(255,255,255,.08)', background: card.primary ? `linear-gradient(180deg, color-mix(in srgb,${AC} 9%,transparent), rgba(255,255,255,.01))` : 'rgba(255,255,255,.02)', borderRadius: 18, padding: 26, height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'inline-flex', width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', background: card.primary ? `color-mix(in srgb,${AC} 16%,transparent)` : 'rgba(255,255,255,.05)', color: AC2 }}>{card.icon}</span>
                    {card.badge && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '.14em', background: `color-mix(in srgb,${AC} 20%,transparent)`, color: AC2, padding: '5px 9px', borderRadius: 6 }}>{card.badge}</span>}
                  </div>
                  <h3 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 19, margin: '18px 0 8px' }}>{card.title}</h3>
                  <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'rgba(244,242,248,.58)', margin: 0 }}>{card.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="como-funciona" style={{ maxWidth: 1000, margin: '0 auto', padding: '96px 20px 0' }}>
          <Reveal>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.14em', color: AC2, textTransform: 'uppercase' }}>Proxy Residencial Rotativa</div>
              <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 40, lineHeight: 1.06, letterSpacing: '-.02em', margin: '14px 0 0' }}>Tudo o que você precisa <span style={{ color: AC }}>em um produto.</span></h2>
              <p style={{ fontSize: 16.5, color: 'rgba(244,242,248,.55)', margin: '14px auto 0', maxWidth: 500 }}>Sem complicação — escolha seu pacote de GB, ative em segundos e navegue com IP residencial real.</p>
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 46 }}>
            {[
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>, title: '+180 Países', desc: 'Geo-targeting por país e por estado no Brasil. Escolha de onde seu IP parece ser.', badge: null },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>, title: 'Rotação Automática', desc: 'IP troca a cada requisição ou em intervalos configuráveis. Anti-detecção máxima.', badge: 'EXCLUSIVO' },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>, title: 'GB Nunca Expira', desc: 'O saldo que você compra fica na conta para sempre. Use no seu ritmo, sem perder nada.', badge: null },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, title: 'HTTP & SOCKS5', desc: 'Suporte completo a HTTP, HTTPS e SOCKS5. Compatível com qualquer software ou bot.', badge: null },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, title: 'IPs Residenciais Reais', desc: 'IPs de dispositivos reais — não datacenter. Passam por qualquer detecção de bot.', badge: null },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1v-7h3M3 19a2 2 0 0 0 2 2h1v-7H3"/></svg>, title: 'Suporte 24/7 em PT', desc: 'Time humano no WhatsApp e chat ao vivo. Resposta média em poucos minutos.', badge: null },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: 24, position: 'relative', height: '100%' }}>
                  {f.badge && <span style={{ position: 'absolute', top: 16, right: 16, fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, letterSpacing: '.1em', background: `color-mix(in srgb,${AC} 20%,transparent)`, color: AC2, padding: '4px 8px', borderRadius: 6 }}>{f.badge}</span>}
                  <span style={{ display: 'inline-flex', width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb,${AC} 14%,transparent)`, color: AC2 }}>{f.icon}</span>
                  <h3 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 17, margin: '14px 0 8px' }}>{f.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: 'rgba(244,242,248,.55)', margin: 0 }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* PRICING */}
        <section id="planos" style={{ maxWidth: 1180, margin: '0 auto', padding: '96px 20px 0' }}>
          <Reveal>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.14em', color: AC2, textTransform: 'uppercase' }}>Planos · Residencial Rotativa</div>
              <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 40, lineHeight: 1.06, letterSpacing: '-.02em', margin: '14px 0 0' }}>Pague só pelo que <span style={{ color: AC }}>usar.</span></h2>
              <p style={{ fontSize: 16.5, color: 'rgba(244,242,248,.55)', margin: '14px auto 0', maxWidth: 480 }}>Sem mensalidade. Seu GB nunca expira. Quanto mais GB, menor o preço.</p>
            </div>
          </Reveal>

          {showCouponBanner && (
            <Reveal delay={120}>
              <div style={{ maxWidth: 760, margin: '30px auto 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', border: `1px solid color-mix(in srgb,${AC} 28%,transparent)`, background: `color-mix(in srgb,${AC} 9%,transparent)`, borderRadius: 14, padding: '14px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 14.5 }}>
                  <span style={{ fontSize: 18 }}>🎁</span>
                  <span>Primeira compra com 10% off — cupom <b style={{ color: '#fff', fontFamily: "'JetBrains Mono',monospace" }}>LUMA10</b> aplicado automaticamente no checkout</span>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(52,211,153,.12)', border: '1px solid rgba(52,211,153,.25)', borderRadius: 8, padding: '7px 13px', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: '#34d399', letterSpacing: '.08em' }}>
                  ✓ LUMA10
                </span>
              </div>
            </Reveal>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginTop: 34 }}>
            {[
              { gb: '1',  price: 'R$ 6,50',   perGb: 'R$ 6,50/GB',  highlight: false, badge: null },
              { gb: '3',  price: 'R$ 18,90',  perGb: 'R$ 6,30/GB',  highlight: false, badge: null },
              { gb: '5',  price: 'R$ 31,90',  perGb: 'R$ 6,38/GB',  highlight: true,  badge: 'MAIS VENDIDO' },
              { gb: '10', price: 'R$ 60,90',  perGb: 'R$ 6,09/GB',  highlight: false, badge: null },
              { gb: '20', price: 'R$ 120,90', perGb: 'R$ 6,05/GB',  highlight: false, badge: 'MELHOR PREÇO' },
            ].map((p, i) => {
              return (
              <Reveal key={p.gb} delay={i * 80}>
                <div style={{ position: 'relative', border: p.highlight ? `1.5px solid ${AC}` : '1px solid rgba(255,255,255,.08)', background: p.highlight ? `linear-gradient(180deg, color-mix(in srgb,${AC} 16%,transparent), rgba(255,255,255,.01))` : 'rgba(255,255,255,.02)', borderRadius: 15, padding: '20px 14px', textAlign: 'center', boxShadow: p.highlight ? `0 12px 40px color-mix(in srgb,${AC} 28%,transparent)` : 'none', height: '100%' }}>
                  {p.badge && <span style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, letterSpacing: '.1em', background: p.highlight ? AC : 'rgba(52,211,153,.18)', color: p.highlight ? '#0a0612' : '#34d399', padding: '4px 9px', borderRadius: 6, whiteSpace: 'nowrap', fontWeight: 700 }}>{p.badge}</span>}
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.14em', color: p.highlight ? AC2 : 'rgba(244,242,248,.4)', textTransform: 'uppercase' }}>RES · ROTATIVA</div>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 28, margin: '8px 0 2px' }}>{p.gb} <span style={{ fontSize: 14, color: 'rgba(244,242,248,.5)' }}>GB</span></div>
                  <div style={{ color: p.highlight ? '#fff' : AC, fontWeight: 800, fontSize: 15, marginTop: 6 }}>{p.price}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: 'rgba(244,242,248,.35)', marginTop: 5 }}>{p.perGb}</div>
                  <button onClick={() => setCheckoutPlan(p.gb)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: 14, padding: '9px 0', borderRadius: 9, background: p.highlight ? AC : 'rgba(255,255,255,.06)', border: p.highlight ? 'none' : '1px solid rgba(255,255,255,.1)', color: p.highlight ? '#0a0612' : 'rgba(244,242,248,.8)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: "'Manrope',sans-serif" }}>
                    Começar
                  </button>
                </div>
              </Reveal>
            )})}
          </div>
          <Reveal delay={200}>
            <div style={{ textAlign: 'center', marginTop: 26 }}>
              {user ? (
                <button onClick={() => setCheckoutPlan('5')} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 15.5, padding: '15px 30px', borderRadius: 14, border: 'none', cursor: 'pointer', boxShadow: `0 12px 36px color-mix(in srgb,${AC} 44%,transparent)`, fontFamily: "'Manrope',sans-serif" }}>
                  Criar minha proxy agora <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </button>
              ) : (
                <Link href="/cadastro" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 15.5, padding: '15px 30px', borderRadius: 14, textDecoration: 'none', boxShadow: `0 12px 36px color-mix(in srgb,${AC} 44%,transparent)` }}>
                  Criar minha proxy agora <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </Link>
              )}
            </div>
          </Reveal>
        </section>

        {/* WHY + LIVE STATS */}
        <section style={{ maxWidth: 1180, margin: '0 auto', padding: '96px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <Reveal>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.14em', color: AC2, textTransform: 'uppercase' }}>Por que Luma</div>
              <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 38, lineHeight: 1.06, letterSpacing: '-.02em', margin: '14px 0 0' }}>Sua infra de proxies, <span style={{ color: AC }}>sem dor de cabeça.</span></h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(244,242,248,.58)', margin: '18px 0 0', maxWidth: 460 }}>A Luma é parceira de quem precisa de proxies residenciais rotativas de alta performance. Acesso a milhões de IPs reais, pagamento flexível, suporte humano e uma política justa: <b style={{ color: '#f4f2f8' }}>seu GB nunca expira.</b></p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 28 }}>
                {['90M+ IPs residenciais reais em +180 países', 'Pague só pelo que usar — GB nunca expira', 'Ativação instantânea via PIX, crypto ou cartão', 'Suporte humano 24/7 em português'].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ display: 'inline-flex', width: 26, height: 26, flexShrink: 0, borderRadius: '50%', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb,${AC} 22%,transparent)`, color: AC2, fontSize: 13 }}>✓</span>
                    <span style={{ fontSize: 15, color: 'rgba(244,242,248,.82)' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
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
          </Reveal>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ maxWidth: 820, margin: '0 auto', padding: '96px 20px 0' }}>
          <Reveal>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.14em', color: AC2, textTransform: 'uppercase' }}>Dúvidas frequentes</div>
              <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 38, lineHeight: 1.06, letterSpacing: '-.02em', margin: '14px 0 0' }}>Perguntas <span style={{ color: AC }}>frequentes.</span></h2>
            </div>
          </Reveal>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 38 }}>
            {[
              { q: 'O GB realmente nunca expira?', a: 'Sim. Diferente da maioria dos provedores, o saldo que você compra fica disponível na sua conta sem prazo de validade. Use no seu ritmo, sem perder nada.' },
              { q: 'O que é proxy residencial rotativa?', a: 'É um IP de um dispositivo residencial real (não datacenter) que troca automaticamente a cada requisição ou em intervalos configuráveis. Isso garante anonimato máximo e praticamente zero bloqueios.' },
              { q: 'Quais formas de pagamento vocês aceitam?', a: 'PIX (ativação instantânea), cartão de crédito e criptomoedas. O saldo é liberado automaticamente em segundos após a confirmação.' },
              { q: 'As proxies funcionam com AdsPower, Multilogin e bots?', a: 'Sim. Suportamos HTTP e SOCKS5, totalmente compatíveis com AdsPower, Multilogin, GoLogin, Dolphin, Selenium, Puppeteer e Playwright, sem vazamento de fingerprint.' },
              { q: 'Posso escolher cidade/estado no Brasil?', a: 'Sim. Oferecemos geo-targeting por país e, no Brasil, segmentação por estado (SP, RJ, MG e outros) nos planos residenciais.' },
              { q: 'Tem suporte em português?', a: 'Sim, suporte humano 24/7 em português e inglês, via WhatsApp e chat ao vivo. Resposta média em poucos minutos.' },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 60}>
                <div style={{ border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 14, overflow: 'hidden' }}>
                  <button onClick={() => toggle(i)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, background: 'none', border: 'none', color: '#f4f2f8', fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 16, textAlign: 'left', padding: '20px 22px', cursor: 'pointer' }}>
                    {f.q}<span style={{ color: AC2, fontSize: 22, flexShrink: 0 }}>{open === i ? '−' : '+'}</span>
                  </button>
                  {open === i && <div style={{ padding: '0 22px 20px', fontSize: 14.5, lineHeight: 1.6, color: 'rgba(244,242,248,.6)' }}>{f.a}</div>}
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '96px 20px 90px' }}>
          <Reveal>
            <div style={{ position: 'relative', overflow: 'hidden', border: `1px solid color-mix(in srgb,${AC} 30%,transparent)`, borderRadius: 26, background: `linear-gradient(135deg, color-mix(in srgb,${AC} 16%,transparent), rgba(255,255,255,.01))`, padding: '62px 40px', textAlign: 'center' }}>
              <div style={{ position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)', width: 560, height: 360, background: `radial-gradient(ellipse at center, color-mix(in srgb,${AC} 32%,transparent), transparent 70%)`, filter: 'blur(14px)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative' }}>
                <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 44, lineHeight: 1.04, letterSpacing: '-.025em', margin: 0 }}>Comece a escalar<br />com a <span style={{ color: AC }}>Luma</span> hoje.</h2>
                <p style={{ fontSize: 17, color: 'rgba(244,242,248,.6)', margin: '18px auto 0', maxWidth: 460 }}>Ative em 30 segundos. Sem mensalidade, sem fidelidade — só performance.</p>
                <div style={{ display: 'flex', gap: 13, justifyContent: 'center', flexWrap: 'wrap', marginTop: 30 }}>
                  {user ? (
                    <button onClick={() => setCheckoutPlan('5')} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 16, padding: '16px 30px', borderRadius: 14, border: 'none', cursor: 'pointer', boxShadow: `0 14px 40px color-mix(in srgb,${AC} 48%,transparent)`, fontFamily: "'Manrope',sans-serif" }}>
                      Comece agora <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </button>
                  ) : (
                    <Link href="/cadastro" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: AC, color: '#0a0612', fontWeight: 800, fontSize: 16, padding: '16px 30px', borderRadius: 14, textDecoration: 'none', boxShadow: `0 14px 40px color-mix(in srgb,${AC} 48%,transparent)` }}>
                      Comece agora <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </Link>
                  )}
                  <a href="#faq" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.14)', color: '#f4f2f8', fontWeight: 700, fontSize: 16, padding: '16px 26px', borderRadius: 14, textDecoration: 'none' }}>Ver perguntas frequentes</a>
                </div>
                <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginTop: 26, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.12em', color: 'rgba(244,242,248,.45)', textTransform: 'uppercase' }}>
                  <span>⚡ Ativação 30s</span><span>↺ Garantia 7 dias</span><span>◷ +2.000 clientes ativos</span>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* FOOTER */}
        <Reveal>
          <footer style={{ borderTop: '1px solid rgba(255,255,255,.07)', background: 'rgba(0,0,0,.3)' }}>
            <div style={{ maxWidth: 1180, margin: '0 auto', padding: '54px 20px 30px', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 36 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="26" height="26" viewBox="0 0 34 34" fill="none"><circle cx="17" cy="17" r="14.5" stroke={AC} strokeWidth="2" opacity=".35"/><path d="M17 2.5a14.5 14.5 0 0 1 0 29" stroke={AC2} strokeWidth="2.6" strokeLinecap="round"/><circle cx="17" cy="17" r="4.6" fill={AC}/></svg>
                  <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 800, fontSize: 17 }}>LUMA<span style={{ color: AC2 }}> PROXIES</span></span>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'rgba(244,242,248,.5)', margin: '14px 0 0', maxWidth: 280 }}>Proxies residenciais rotativas premium em +180 países. Setup em segundos, GB nunca expira.</p>
              </div>
              {[
                { title: 'Planos', links: ['1 GB — R$ 6,50', '3 GB — R$ 18,90', '5 GB — R$ 31,90', '10 GB — R$ 60,90', '20 GB — R$ 120,90'] },
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
        </Reveal>

      </div>

      {/* ── CHECKOUT MODAL ── */}
      {checkoutPlan !== null && (
        <CheckoutModal
          initialPlan={checkoutPlan}
          user={user}
          onClose={() => setCheckoutPlan(null)}
        />
      )}

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

              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.07)', flexShrink: 0 }}>
                <button style={tabSt('visao-geral')} onClick={() => setModalTab('visao-geral')}>Visão geral</button>
                <button style={tabSt('meu-plano')}   onClick={() => setModalTab('meu-plano')}>Meu plano</button>
                <button style={tabSt('conta')}        onClick={() => setModalTab('conta')}>Conta</button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

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

                {modalTab === 'meu-plano' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ border: `1px solid color-mix(in srgb,${AC} 22%,transparent)`, borderRadius: 14, padding: '18px 20px', background: `color-mix(in srgb,${AC} 8%,transparent)` }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.14em', color: AC2, textTransform: 'uppercase' }}>Plano atual</div>
                      <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 24, marginTop: 6 }}>Free</div>
                      <div style={{ fontSize: 13, color: 'rgba(244,242,248,.5)', marginTop: 4 }}>Sem GB ativo. Adicione saldo para começar.</div>
                    </div>
                    {[['Tipo de proxy','Residencial Rotativa'],['GB ativo','0 GB'],['Validade','Não expira'],['Região padrão','Brasil']].map(([k,v]) => (
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
