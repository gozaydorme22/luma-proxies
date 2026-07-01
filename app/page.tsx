'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { onAuthStateChanged, User, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { WorldMap } from '@/components/WorldMap'
import { CheckoutModal } from '@/components/CheckoutModal'
import type { ProxyResult } from '@/app/api/proxy-check/route'

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

const NAV_ITEMS = [
  { href: '#como-funciona', id: 'como-funciona', label: 'Vantagens' },
  { href: '#planos',        id: 'planos',        label: 'Preços' },
  { href: '#checker',       id: 'checker',       label: 'Checker' },
  { href: '#faq',           id: 'faq',           label: 'FAQ' },
] as const

function NavSections({ activeSection, AC }: { activeSection: string; AC: string }) {
  const refs = useRef<(HTMLAnchorElement | null)[]>([])
  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 })

  useEffect(() => {
    const idx = NAV_ITEMS.findIndex(n => n.id === activeSection)
    const el = refs.current[idx]
    if (!el) { setIndicator(p => ({ ...p, opacity: 0 })); return }
    const parent = el.parentElement!.getBoundingClientRect()
    const rect = el.getBoundingClientRect()
    setIndicator({ left: rect.left - parent.left, width: rect.width, opacity: 1 })
  }, [activeSection])

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 26 }}>
      {NAV_ITEMS.map(({ href, id, label }, i) => (
        <a
          key={id}
          href={href}
          ref={el => { refs.current[i] = el }}
          style={{
            fontSize: 14, fontWeight: 600,
            color: activeSection === id ? '#fff' : 'rgba(244,242,248,.62)',
            textDecoration: 'none',
            transition: 'color .25s ease',
            paddingBottom: 2,
          }}
        >
          {label}
        </a>
      ))}
      {/* underline deslizante */}
      <span style={{
        position: 'absolute',
        bottom: -6,
        left: indicator.left,
        width: indicator.width,
        height: 2,
        borderRadius: 2,
        background: AC,
        opacity: indicator.opacity,
        transition: 'left .3s cubic-bezier(.4,0,.2,1), width .3s cubic-bezier(.4,0,.2,1), opacity .2s ease',
        pointerEvents: 'none',
      }} />
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

  const [modalProxies, setModalProxies]         = useState<Array<{id:string;name:string;host:string;port:number;proxyUser:string;proxyPass:string;status:string;totalGb:number;usedGb:number}>>([])
  const [modalActiveCount, setModalActiveCount] = useState<number|null>(null)
  const [modalOrdersCount, setModalOrdersCount] = useState<number|null>(null)
  const [modalDataLoading, setModalDataLoading] = useState(false)
  const [modalCopied, setModalCopied]           = useState<string|null>(null)
  const [modalCheckerMap, setModalCheckerMap]   = useState<Record<string, boolean>>({})
  const [modalRemoving, setModalRemoving]       = useState<string|null>(null)

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

  useEffect(() => {
    if (!modalOpen) { setModalCheckerMap({}); return }
    async function fetchModalData() {
      setModalDataLoading(true)
      try {
        const [proxRes, orderRes] = await Promise.all([fetch('/api/proxies'), fetch('/api/pedidos')])
        const proxJson  = proxRes.ok  ? await proxRes.json()  : { proxies: [] }
        const orderJson = orderRes.ok ? await orderRes.json() : { orders: [] }
        const myProxies = proxJson.proxies ?? []
        setModalProxies(myProxies)
        setModalOrdersCount((orderJson.orders ?? []).length)
        const toCheck = myProxies.filter((p: {status:string}) => p.status === 'ativa')
        if (toCheck.length === 0) { setModalActiveCount(0); return }
        const checkRes = await fetch('/api/proxy-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proxies: toCheck.map((p: {host:string;port:number;proxyUser:string;proxyPass:string}) => `${p.host}:${p.port}:${p.proxyUser}:${p.proxyPass}`) }),
        })
        if (checkRes.ok) {
          const results: Array<{status:string}> = await checkRes.json()
          const map: Record<string,boolean> = {}
          toCheck.forEach((p: {id:string}, i: number) => { map[p.id] = results[i]?.status === 'success' })
          setModalCheckerMap(map)
          setModalActiveCount(Object.values(map).filter(Boolean).length)
        } else {
          setModalActiveCount(toCheck.length)
        }
      } catch {
        setModalActiveCount(null); setModalOrdersCount(null)
      } finally {
        setModalDataLoading(false)
      }
    }
    fetchModalData()
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
      await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
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

  // Open checkout modal if ?checkout=<plan> is in the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const plan   = params.get('checkout')
    if (plan) {
      setCheckoutPlan(['3','5','10','20'].includes(plan) ? plan : '5')
      const url = new URL(window.location.href)
      url.searchParams.delete('checkout')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  // Proxy checker
  const [cInput, setCInput]     = useState('')
  const [cResults, setCResults] = useState<ProxyResult[]>([])
  const [cLoading, setCLoading] = useState(false)
  const [cTested, setCTested]   = useState(0)
  const [cTotal, setCTotal]     = useState(0)

  async function runChecker() {
    const proxies = cInput.split('\n').map(l => l.trim()).filter(Boolean)
    if (!proxies.length) return
    setCLoading(true); setCResults([]); setCTested(0); setCTotal(proxies.length)
    for (let i = 0; i < proxies.length; i += 10) {
      const batch = proxies.slice(i, i + 10)
      try {
        const res = await fetch('/api/proxy-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proxies: batch }) })
        const data: ProxyResult[] = await res.json()
        setCResults(prev => [...prev, ...data])
        setCTested(prev => prev + data.length)
      } catch { setCTested(prev => prev + batch.length) }
    }
    setCLoading(false)
  }

  function exportCheckerCsv() {
    const header = 'Proxy,Host,Porta,IP de Saída,Status,Latência (ms),País,Cidade,ISP,Anônimo'
    const rows = cResults.map(r => [`"${r.raw}"`, r.host, r.port, r.exitIp ?? '-', r.status, r.latency ?? '-', r.country ?? '-', r.city ?? '-', `"${r.isp ?? '-'}"`, r.anonymous ? 'Sim' : 'Não'].join(','))
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'proxies.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const [navOpen, setNavOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const [activeSection, setActiveSection] = useState('')
  useEffect(() => {
    const ids = ['como-funciona', 'planos', 'checker', 'faq']
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id) })
      },
      { rootMargin: '-40% 0px -55% 0px' }
    )
    ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])

  const ctaCardRef = useRef<HTMLDivElement>(null)
  const ctaGlowRef = useRef<HTMLDivElement>(null)

  function handleCtaMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const card = ctaCardRef.current
    const glow = ctaGlowRef.current
    if (!card || !glow) return
    const rect = card.getBoundingClientRect()
    glow.style.left = `${e.clientX - rect.left}px`
    glow.style.top  = `${e.clientY - rect.top}px`
    glow.style.opacity = '1'
  }

  function handleCtaMouseLeave() {
    const glow = ctaGlowRef.current
    if (glow) glow.style.opacity = '0'
  }

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
        <nav style={{ width: '100%', backdropFilter: 'blur(32px) saturate(160%)', WebkitBackdropFilter: 'blur(32px) saturate(160%)', background: scrolled ? 'rgba(8,7,12,.88)' : 'rgba(8,7,12,.55)', borderBottom: `1px solid ${scrolled ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.06)'}`, boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,.5), 0 1px 0 rgba(168,85,247,.08)' : 'none', transition: 'background .3s ease, box-shadow .3s ease, border-color .3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, maxWidth: 1180, margin: '0 auto', padding: '13px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexShrink: 0, whiteSpace: 'nowrap' }}>
              <span style={{ display: 'inline-flex', filter: `drop-shadow(0 0 10px color-mix(in srgb,${AC} 70%,transparent))` }}>
                <svg width="30" height="30" viewBox="0 0 34 34" fill="none"><circle cx="17" cy="17" r="14.5" stroke={AC} strokeWidth="2" opacity=".35"/><path d="M17 2.5a14.5 14.5 0 0 1 0 29" stroke={AC2} strokeWidth="2.6" strokeLinecap="round"/><circle cx="17" cy="17" r="4.6" fill={AC}/></svg>
              </span>
              <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 19, letterSpacing: '-.02em' }}>LUMA<span style={{ color: AC2 }}> PROXYS</span></span>
            </div>
            <div className="nav-sections-wrap"><NavSections activeSection={activeSection} AC={AC} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* hamburger — só mobile */}
              <button className="nav-hamburger-btn" onClick={() => setNavOpen(o => !o)} aria-label="Menu">
                {navOpen
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                }
              </button>
              {user === undefined ? null : user ? (
                <button onClick={() => { setModalTab('visao-geral'); setModalOpen(true) }} className="btn-user">
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: AC, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, color: '#0a0612', flexShrink: 0, overflow: 'hidden' }}>
                    {user.photoURL
                      ? <img src={user.photoURL} width={32} height={32} style={{ objectFit: 'cover', borderRadius: '50%' }} alt="" />
                      : (user.displayName || user.email || '?')[0].toUpperCase()}
                  </span>
                  <span className="nav-user-name" style={{ fontSize: 13.5, fontWeight: 600, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <svg className="nav-user-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: .4 }}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                </button>
              ) : (
                <div className="nav-auth-desktop" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Link href="/login?redirect=/" style={{ fontSize: 14, fontWeight: 600, color: 'rgba(244,242,248,.8)', textDecoration: 'none' }}>Entrar</Link>
                  <Link href="/cadastro" className="btn-nav">
                    Começar agora
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </nav>
        {/* Mobile menu */}
        <div className={`nav-mobile-menu${navOpen ? ' open' : ''}`}>
          {[
            { href: '#como-funciona', label: 'Vantagens' },
            { href: '#planos',        label: 'Preços' },
            { href: '#checker',       label: 'Checker' },
            { href: '#faq',           label: 'FAQ' },
          ].map(({ href, label }) => (
            <a key={href} href={href} className={`nav-mobile-link${activeSection === href.slice(1) ? ' active' : ''}`} onClick={() => setNavOpen(false)}>
              {label}
            </a>
          ))}
          {!user && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', marginTop: 8, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <a href="/login?redirect=/" className="nav-mobile-link">Entrar</a>
            </div>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 2, paddingTop: 60 }}>

        {/* HERO */}
        <header className="hero-grid">
          <div style={{ animation: 'lumaRise .7s ease both', textAlign: 'left' }}>
            <div className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, border: `1px solid color-mix(in srgb,${AC} 30%,transparent)`, background: `color-mix(in srgb,${AC} 10%,transparent)`, borderRadius: 999, padding: '7px 14px', fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, letterSpacing: '.16em', color: AC2, textTransform: 'uppercase' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399', display: 'inline-block', flexShrink: 0, animation: 'lumaBlink 1.4s infinite' }} />IPs Residenciais Reais · Rotação Automática
            </div>
            <h1 className="hero-h1" style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 54, lineHeight: 1.0, letterSpacing: '-.025em', margin: '22px 0 0', textAlign: 'left' }}>
              Proxy <span style={{ color: AC }}>Residencial</span><br /><span style={{ color: AC }}>Rotativa</span> Premium
            </h1>
            <p style={{ fontSize: 16, lineHeight: 1.65, color: 'rgba(244,242,248,.6)', maxWidth: 480, margin: '22px 0 0' }}>IPs residenciais reais com rotação automática. Pague só pelo que usar, acompanhe o consumo <b style={{ color: '#f4f2f8' }}>em tempo real</b>.</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 13, marginTop: 30 }}>
              {user ? (
                <button onClick={() => setCheckoutPlan('5')} className="btn-primary">
                  Comece agora <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </button>
              ) : (
                <Link href="/cadastro" className="btn-primary">
                  Comece agora <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </Link>
              )}
              <a href="#planos" className="btn-secondary">Ver preços</a>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
              {[
                { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>, text: 'Rotação automática' },
                { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>, text: 'Pay per Use' },
                { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1v-7h3M3 19a2 2 0 0 0 2 2h1v-7H3"/></svg>, text: 'Suporte 24/7' },
                { icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, text: '100% Anônimo' },
              ].map(item => (
                <div key={item.text} className="pill-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,.09)', background: 'rgba(255,255,255,.025)', borderRadius: 11, padding: '10px 14px', fontSize: 13.5, fontWeight: 600, color: 'rgba(244,242,248,.82)' }}>
                  {item.icon}{item.text}
                </div>
              ))}
            </div>

            <div className="panel-hover hero-trust-panel" style={{ marginTop: 26, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <span style={{ color: AC2, letterSpacing: 2 }}>★★★★★</span>
                <b style={{ color: '#f4f2f8' }}>4,9/5</b><span style={{ color: 'rgba(244,242,248,.45)' }}>· +567 avaliações verificadas</span>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '13px 0' }} />
              <div className="trust-row" style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.13em', color: 'rgba(244,242,248,.5)', textTransform: 'uppercase', display: 'flex', flexWrap: 'wrap', gap: 18 }}>
                <span>{'⚡︎'} ATIVAÇÃO IMEDIATA</span>
                <span className="trust-sep" style={{ opacity: .3 }}>·</span>
                <span>{'🛡︎'} ANTI-DETECÇÃO</span>
                <span className="trust-sep" style={{ opacity: .3 }}>·</span>
                <span>↻ ROTAÇÃO AUTO</span>
                <span className="trust-sep" style={{ opacity: .3 }}>·</span>
                <span>$ PIX</span>
                <span className="trust-sep" style={{ opacity: .3 }}>·</span>
                <span>₿ CRYPTO</span>
              </div>
              <div style={{ marginTop: 13, paddingTop: 13, borderTop: '1px solid rgba(255,255,255,.06)', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.1em', color: 'rgba(244,242,248,.55)' }}>
                <span style={{ color: '#34d399' }}>●</span> 99.98% UPTIME
              </div>
            </div>
          </div>

          {/* DOT MAP */}
          <div style={{ animation: 'lumaRise .9s ease both', paddingTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.14em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase', marginBottom: 14 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'lumaBlink 1.6s infinite', display: 'inline-block' }} />
              Cobertura global · +180 países
            </div>
            <div className="panel-hover" style={{ width: '100%', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, background: 'rgba(255,255,255,.018)', padding: '20px 16px 14px', overflow: 'hidden' }}>
              <WorldMap />
            </div>
          </div>

        </header>


        {/* HOW IT WORKS */}
        <section id="como-funciona" style={{ maxWidth: 1000, margin: '0 auto', padding: '72px 20px 0' }}>
          <Reveal>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.14em', color: AC2, textTransform: 'uppercase' }}>Proxy Residencial Rotativa</div>
              <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 40, lineHeight: 1.06, letterSpacing: '-.02em', margin: '14px 0 0' }}>Tudo o que você precisa <span style={{ color: AC }}>em uma proxy.</span></h2>
              <p style={{ fontSize: 16.5, color: 'rgba(244,242,248,.55)', margin: '14px auto 0', maxWidth: 500 }}>Sem complicação, escolha seu pacote de GB, ative em segundos e navegue com IP residencial real.</p>
            </div>
          </Reveal>
          <div className="cards-3-sm">
            {[
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>, title: '+180 Países', desc: 'Geo-targeting por país e por estado no Brasil. Escolha de onde seu IP parece ser.', badge: null },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>, title: 'Rotação Automática', desc: 'IP troca a cada requisição ou em intervalos configuráveis. Anti-detecção máxima.', badge: 'EXCLUSIVO' },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>, title: 'Ativação Imediata', desc: 'Confirmou o pagamento, proxy liberada na hora. Sem burocracia, sem espera.', badge: null },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, title: 'HTTP & SOCKS5', desc: 'Suporte completo a HTTP, HTTPS e SOCKS5. Compatível com qualquer software ou bot.', badge: null },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, title: 'IPs Residenciais Reais', desc: 'IPs de dispositivos reais — não datacenter. Passam por qualquer detecção de bot.', badge: null },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1v-7h3M3 19a2 2 0 0 0 2 2h1v-7H3"/></svg>, title: 'Suporte 24/7 em PT', desc: 'Time humano no WhatsApp e chat ao vivo. Resposta média em poucos minutos.', badge: null },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="card-hover">
                  {f.badge && <span style={{ position: 'absolute', top: 16, right: 16, fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, letterSpacing: '.1em', background: `color-mix(in srgb,${AC} 20%,transparent)`, color: AC2, padding: '4px 8px', borderRadius: 6 }}>{f.badge}</span>}
                  <span style={{ display: 'inline-flex', width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb,${AC} 14%,transparent)`, border: `1px solid color-mix(in srgb,${AC} 28%,transparent)`, color: AC2 }}>{f.icon}</span>
                  <h3 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 17, margin: '14px 0 8px' }}>{f.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.55, color: 'rgba(244,242,248,.55)', margin: 0 }}>{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* PRICING */}
        <section id="planos" style={{ maxWidth: 1180, margin: '0 auto', padding: '72px 20px 0' }}>
          <Reveal>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.14em', color: AC2, textTransform: 'uppercase' }}>Planos · Residencial Rotativa</div>
              <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 40, lineHeight: 1.06, letterSpacing: '-.02em', margin: '14px 0 0' }}>Pague só pelo que <span style={{ color: AC }}>usar.</span></h2>
              <p style={{ fontSize: 16.5, color: 'rgba(244,242,248,.55)', margin: '14px auto 0', maxWidth: 480 }}>Sem mensalidade. Quanto mais GB, menor o preço.</p>
            </div>
          </Reveal>

          {showCouponBanner && (
            <Reveal delay={120}>
              <div className="panel-hover" style={{ maxWidth: 760, margin: '30px auto 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', border: `1px solid color-mix(in srgb,${AC} 28%,transparent)`, background: `color-mix(in srgb,${AC} 9%,transparent)`, borderRadius: 14, padding: '14px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 14.5 }}>
                  <span style={{ fontSize: 18 }}>🎁</span>
                  <span>Primeira compra com 10% off — cupom <b style={{ color: '#fff', fontFamily: "'JetBrains Mono',monospace" }}>LUMA10</b> aplicado automaticamente no checkout</span>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(52,211,153,.12)', border: '1px solid rgba(52,211,153,.25)', borderRadius: 8, padding: '7px 13px', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, color: '#34d399', letterSpacing: '.08em' }}>
                  ✓ LUMA10
                </span>
              </div>
            </Reveal>
          )}

          <div className="cards-4">
            {[
              { gb: '3',  price: 'R$ 18,90',  perGb: 'R$ 6,30/GB',  highlight: false, badge: null },
              { gb: '5',  price: 'R$ 31,90',  perGb: 'R$ 6,38/GB',  highlight: true,  badge: 'MAIS VENDIDO' },
              { gb: '10', price: 'R$ 60,90',  perGb: 'R$ 6,09/GB',  highlight: false, badge: null },
              { gb: '20', price: 'R$ 120,90', perGb: 'R$ 6,05/GB',  highlight: false, badge: 'MELHOR PREÇO' },
            ].map((p, i) => {
              return (
              <Reveal key={p.gb} delay={i * 80}>
                <div className={`pricing-card${p.highlight ? ' pricing-card-highlight' : ''}`} style={{ border: p.highlight ? `1.5px solid ${AC}` : '1px solid rgba(255,255,255,.08)', background: p.highlight ? `linear-gradient(180deg, color-mix(in srgb,${AC} 16%,transparent), rgba(255,255,255,.01))` : 'rgba(255,255,255,.02)', boxShadow: p.highlight ? `0 12px 40px color-mix(in srgb,${AC} 28%,transparent)` : 'none' }}>
                  {p.badge && <span style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', fontFamily: "'JetBrains Mono',monospace", fontSize: 8.5, letterSpacing: '.1em', background: p.highlight ? AC : 'rgba(52,211,153,.18)', color: p.highlight ? '#0a0612' : '#34d399', padding: '4px 9px', borderRadius: 6, whiteSpace: 'nowrap', fontWeight: 600 }}>{p.badge}</span>}
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.14em', color: p.highlight ? AC2 : 'rgba(244,242,248,.4)', textTransform: 'uppercase' }}>RES · ROTATIVA</div>
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 28, margin: '8px 0 2px' }}>{p.gb} <span style={{ fontSize: 14, color: 'rgba(244,242,248,.5)' }}>GB</span></div>
                  <div style={{ color: p.highlight ? '#fff' : AC, fontWeight: 600, fontSize: 15, marginTop: 6 }}>{p.price}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: 'rgba(244,242,248,.35)', marginTop: 5 }}>{p.perGb}</div>
                  <button onClick={() => setCheckoutPlan(p.gb)} className={p.highlight ? 'btn-plan-highlight' : 'btn-plan'}>
                    Começar
                  </button>
                </div>
              </Reveal>
            )})}
          </div>
          <Reveal delay={200}>
            <div style={{ textAlign: 'center', marginTop: 26 }}>
              {user ? (
                <button onClick={() => setCheckoutPlan('5')} className="btn-primary">
                  Criar minha proxy agora <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </button>
              ) : (
                <Link href="/cadastro" className="btn-primary">
                  Criar minha proxy agora <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </Link>
              )}
            </div>
          </Reveal>
        </section>

        {/* PROXY CHECKER */}
        <section id="checker" style={{ maxWidth: 980, margin: '0 auto', padding: '72px 20px 0' }}>
          <Reveal>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.14em', color: AC2, textTransform: 'uppercase' }}>Ferramenta gratuita</div>
              <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 40, lineHeight: 1.06, letterSpacing: '-.02em', margin: '14px 0 0' }}>Proxy <span style={{ color: AC }}>Checker</span></h2>
              <p style={{ fontSize: 16, color: 'rgba(244,242,248,.55)', margin: '14px auto 0', maxWidth: 480 }}>Teste proxies HTTP, HTTPS e SOCKS5 com geolocalização, latência e status em tempo real.</p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="panel-hover" style={{ marginTop: 36, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, padding: '22px 24px 24px' }}>
              <label style={{ display: 'block', fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.14em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase', marginBottom: 12 }}>
                Proxys <span style={{ color: 'rgba(244,242,248,.2)' }}>· máx. 50</span>
              </label>
              <textarea
                value={cInput}
                onChange={e => setCInput(e.target.value)}
                placeholder={'Uma proxy por linha. Formatos:\nIP:PORTA:USUARIO:SENHA\nIP:PORTA\nUSUARIO:SENHA@IP:PORTA\nsocks5://USUARIO:SENHA@IP:PORTA'}
                rows={6}
                style={{ width: '100%', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '12px 14px', color: '#f4f2f8', fontFamily: "'JetBrains Mono',monospace", fontSize: 13, lineHeight: 1.7, resize: 'vertical', outline: 'none', boxSizing: 'border-box', caretColor: AC }}
              />
              <button
                onClick={runChecker}
                disabled={cLoading || !cInput.trim()}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '14px 0', marginTop: 14 }}
              >
                {cLoading
                  ? <>◌ Testando… ({cTested}/{cTotal})</>
                  : <>Testar <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></>}
              </button>
            </div>
          </Reveal>

          {(cResults.length > 0 || cLoading) && (
            <Reveal>
              <div style={{ marginTop: 16, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.02)', borderRadius: 18, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={AC2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Resultado</span>
                    {cLoading && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, color: 'rgba(244,242,248,.35)', letterSpacing: '.08em' }}>processando {cTested}/{cTotal}…</span>}
                  </div>
                  {cResults.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: 'rgba(244,242,248,.4)' }}>
                        <span style={{ color: '#34d399' }}>{cResults.filter(r => r.status === 'success').length}</span> / {cResults.length} com sucesso
                      </span>
                      <button onClick={exportCheckerCsv} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '6px 12px', color: 'rgba(244,242,248,.8)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        Exportar CSV
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                        {['Endereço IP', 'Porta', 'IP de saída', 'Estado', 'Latência', 'Local', 'ISP', 'Anônimo'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '.1em', color: 'rgba(244,242,248,.3)', textTransform: 'uppercase', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cResults.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                          <td style={{ padding: '12px 16px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'rgba(244,242,248,.8)', whiteSpace: 'nowrap' }}>{r.host || r.raw.split(':')[0]}</td>
                          <td style={{ padding: '12px 16px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: 'rgba(244,242,248,.45)' }}>{r.port || '-'}</td>
                          <td style={{ padding: '12px 16px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: r.exitIp ? '#f4f2f8' : 'rgba(244,242,248,.25)', whiteSpace: 'nowrap' }}>{r.exitIp ?? '—'}</td>
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            {r.status === 'success'
                              ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#34d399', fontWeight: 600, fontSize: 12.5 }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Sucesso</span>
                              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#f87171', fontWeight: 600, fontSize: 12.5 }} title={r.error}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>Falha</span>}
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: "'JetBrains Mono',monospace", fontSize: 12, whiteSpace: 'nowrap' }}>
                            {r.latency != null
                              ? <span style={{ color: r.latency < 600 ? '#34d399' : r.latency < 1500 ? '#fbbf24' : '#f87171' }}>{r.latency} ms</span>
                              : <span style={{ color: 'rgba(244,242,248,.2)' }}>—</span>}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, whiteSpace: 'nowrap', color: 'rgba(244,242,248,.7)' }}>
                            {r.country
                              ? <>{r.countryCode && String.fromCodePoint(0x1F1E6 + r.countryCode.charCodeAt(0) - 65, 0x1F1E6 + r.countryCode.charCodeAt(1) - 65)} {r.city ? `${r.city}, ` : ''}{r.countryCode}</>
                              : <span style={{ color: 'rgba(244,242,248,.2)' }}>—</span>}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 12.5, color: 'rgba(244,242,248,.55)', maxWidth: 180 }}>
                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.isp ?? <span style={{ color: 'rgba(244,242,248,.2)' }}>—</span>}</span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13 }}>
                            {r.anonymous ? <span style={{ color: '#34d399', fontWeight: 600 }}>Anônimo</span> : <span style={{ color: 'rgba(244,242,248,.25)' }}>—</span>}
                          </td>
                        </tr>
                      ))}
                      {cLoading && Array.from({ length: Math.min(cTotal - cTested, 3) }).map((_, i) => (
                        <tr key={`sk${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <td key={j} style={{ padding: '12px 16px' }}>
                              <span style={{ display: 'block', height: 12, borderRadius: 5, background: 'rgba(255,255,255,.05)', width: j === 0 ? 110 : j === 5 ? 90 : 50, animation: 'lumaBlink 1.4s infinite' }} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Reveal>
          )}
        </section>

        {/* FAQ */}
        <section id="faq" style={{ maxWidth: 820, margin: '0 auto', padding: '72px 20px 0' }}>
          <Reveal>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.14em', color: AC2, textTransform: 'uppercase' }}>Dúvidas frequentes</div>
              <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 38, lineHeight: 1.06, letterSpacing: '-.02em', margin: '14px 0 0' }}>Perguntas <span style={{ color: AC }}>frequentes.</span></h2>
            </div>
          </Reveal>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 38 }}>
            {[
              { q: 'O que é proxy residencial rotativa?', a: 'É um IP de um dispositivo residencial real (não datacenter) que troca automaticamente a cada requisição ou em intervalos configuráveis. Isso garante anonimato máximo e praticamente zero bloqueios.' },
              { q: 'Quais formas de pagamento vocês aceitam?', a: 'PIX (ativação instantânea), cartão de crédito e criptomoedas. O saldo é liberado automaticamente em segundos após a confirmação.' },
              { q: 'As proxies funcionam com AdsPower, Multilogin e bots?', a: 'Sim. Suportamos HTTP e SOCKS5, totalmente compatíveis com AdsPower, Multilogin, GoLogin, Dolphin, Selenium, Puppeteer e Playwright, sem vazamento de fingerprint.' },
              { q: 'Posso escolher cidade/estado no Brasil?', a: 'Sim. Oferecemos geo-targeting por país e, no Brasil, segmentação por estado (SP, RJ, MG e outros) nos planos residenciais.' },
              { q: 'Tem suporte em português?', a: 'Sim, suporte humano 24/7 em português e inglês, via WhatsApp e chat ao vivo. Resposta média em poucos minutos.' },
            ].map((f, i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="faq-item">
                  <button onClick={() => toggle(i)} className="faq-btn">
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
            <div ref={ctaCardRef} className="cta-card" onMouseMove={handleCtaMouseMove} onMouseLeave={handleCtaMouseLeave} style={{ position: 'relative', overflow: 'hidden', border: `1px solid color-mix(in srgb,${AC} 42%,transparent)`, borderRadius: 26, background: `linear-gradient(160deg, color-mix(in srgb,${AC} 18%,transparent) 0%, rgba(255,255,255,.01) 60%)`, textAlign: 'center', boxShadow: `0 0 0 1px color-mix(in srgb,${AC} 8%,transparent), 0 40px 80px color-mix(in srgb,${AC} 14%,transparent)` }}>
              {/* glow que segue o mouse */}
              <div ref={ctaGlowRef} style={{ position: 'absolute', width: 560, height: 560, borderRadius: '50%', background: `radial-gradient(circle at center, color-mix(in srgb,${AC} 38%,transparent), transparent 65%)`, transform: 'translate(-50%,-50%)', filter: 'blur(36px)', pointerEvents: 'none', opacity: 0, transition: 'opacity 0.35s ease', zIndex: 0 }} />
              {/* glow inferior */}
              <div style={{ position: 'absolute', bottom: -80, left: '50%', transform: 'translateX(-50%)', width: 400, height: 280, background: `radial-gradient(ellipse at center, color-mix(in srgb,${AC} 22%,transparent), transparent 70%)`, filter: 'blur(18px)', pointerEvents: 'none' }} />
              {/* grid decorativo */}
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(168,85,247,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,.04) 1px, transparent 1px)`, backgroundSize: '48px 48px', pointerEvents: 'none' }} />
              <div style={{ position: 'relative' }}>
                <h2 style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 44, lineHeight: 1.04, letterSpacing: '-.025em', margin: 0 }}>Comece a escalar<br />com a <span style={{ color: AC }}>Luma</span> hoje.</h2>
                <p style={{ fontSize: 17, color: 'rgba(244,242,248,.6)', margin: '18px auto 0', maxWidth: 460 }}>Sem mensalidade. Ativação imediata via PIX ou cripto.</p>
                <div style={{ display: 'flex', gap: 13, justifyContent: 'center', flexWrap: 'wrap', marginTop: 30 }}>
                  {user ? (
                    <button onClick={() => setCheckoutPlan('5')} className="btn-primary" style={{ fontSize: 16, padding: '16px 30px' }}>
                      Comece agora <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </button>
                  ) : (
                    <Link href="/cadastro" className="btn-primary" style={{ fontSize: 16, padding: '16px 30px' }}>
                      Comece agora <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </Link>
                  )}
                  <a href="#planos" className="btn-secondary" style={{ fontSize: 16, padding: '16px 26px' }}>Ver planos</a>
                </div>
                <div className="cta-trust-row" style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginTop: 26, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.12em', color: 'rgba(244,242,248,.45)', textTransform: 'uppercase' }}>
                  <span>{'⚡︎'} Ativação imediata</span><span>$ PIX · ₿ Cripto</span><span>↻ Suporte 24/7</span>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* FOOTER */}
        <Reveal>
          <footer style={{ borderTop: '1px solid rgba(255,255,255,.07)', background: 'rgba(0,0,0,.3)' }}>
            <div className="footer-grid">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="26" height="26" viewBox="0 0 34 34" fill="none"><circle cx="17" cy="17" r="14.5" stroke={AC} strokeWidth="2" opacity=".35"/><path d="M17 2.5a14.5 14.5 0 0 1 0 29" stroke={AC2} strokeWidth="2.6" strokeLinecap="round"/><circle cx="17" cy="17" r="4.6" fill={AC}/></svg>
                  <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 17 }}>LUMA<span style={{ color: AC2 }}> PROXYS</span></span>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'rgba(244,242,248,.5)', margin: '14px 0 0', maxWidth: 280 }}>Proxys residenciais rotativas premium. Ativação imediata.</p>
              </div>
              {[
                { title: 'Planos', links: ['3 GB — R$ 18,90', '5 GB — R$ 31,90', '10 GB — R$ 60,90', '20 GB — R$ 120,90'] },
                { title: 'Empresa', links: ['Afiliados', 'FAQ', 'Suporte', 'Termos'] },
                { title: 'Contato', links: ['WhatsApp', 'Telegram', 'Instagram', 'E-mail'] },
              ].map(col => (
                <div key={col.title}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.16em', color: 'rgba(244,242,248,.4)', textTransform: 'uppercase', marginBottom: 14 }}>{col.title}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
                    {col.links.map(l => <a key={l} href="#" className="footer-link">{l}</a>)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ maxWidth: 1180, margin: '0 auto', padding: 20, borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, fontSize: 12.5, color: 'rgba(244,242,248,.4)' }}>
              <span>© 2026 Luma Proxys. Todos os direitos reservados.</span>
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
          textTransform: 'uppercase', fontWeight: 600, padding: '11px 16px',
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
                  <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 18, color: '#f4f2f8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(244,242,248,.4)', marginTop: 2 }}>{email}</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.18)', borderRadius: 999, padding: '3px 9px', fontSize: 10.5, fontWeight: 600, color: '#34d399', fontFamily: "'JetBrains Mono',monospace" }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />Conta ativa
                  </div>
                </div>
                <button onClick={() => setModalOpen(false)} className="btn-close">
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
                      { label: 'Proxys ativas', val: modalDataLoading ? '...' : modalActiveCount !== null ? String(modalActiveCount) : '—', color: AC },
                      { label: 'Pedidos realizados', val: modalDataLoading ? '...' : modalOrdersCount !== null ? String(modalOrdersCount) : '—', color: '#f4f2f8' },
                    ].map(s => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '13px 16px' }}>
                        <span style={{ fontSize: 13.5, color: 'rgba(244,242,248,.55)' }}>{s.label}</span>
                        <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 18, color: s.color }}>{s.val}</span>
                      </div>
                    ))}
                    <Link href="/dashboard" onClick={() => setModalOpen(false)} style={{ display: 'block', textAlign: 'center', background: AC, color: '#0a0612', fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 13.5, padding: '11px 0', borderRadius: 12, textDecoration: 'none', marginTop: 4 }}>
                      Ir para o dashboard
                    </Link>
                  </div>
                )}

                {modalTab === 'meu-plano' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {modalDataLoading ? (
                      <div style={{ textAlign: 'center', padding: '28px 0', color: 'rgba(244,242,248,.35)', fontSize: 13 }}>Carregando...</div>
                    ) : modalProxies.length === 0 ? (
                      <>
                        <div style={{ border: `1px solid color-mix(in srgb,${AC} 22%,transparent)`, borderRadius: 14, padding: '18px 20px', background: `color-mix(in srgb,${AC} 8%,transparent)` }}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.14em', color: AC2, textTransform: 'uppercase' }}>Plano atual</div>
                          <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 900, fontSize: 22, marginTop: 6 }}>Sem proxies</div>
                          <div style={{ fontSize: 13, color: 'rgba(244,242,248,.5)', marginTop: 4 }}>Nenhuma proxy atribuída à sua conta ainda.</div>
                        </div>
                      </>
                    ) : modalProxies.map(proxy => {
                      const connStr     = `${proxy.host}:${proxy.port}:${proxy.proxyUser}:${proxy.proxyPass}`
                      const isCopied    = modalCopied === proxy.id
                      const checkerDone = proxy.id in modalCheckerMap
                      const isAlive     = checkerDone ? modalCheckerMap[proxy.id] : proxy.status === 'ativa'
                      const isRemoving  = modalRemoving === proxy.id
                      const pct         = proxy.totalGb > 0 ? Math.min(100, Math.round((proxy.usedGb / proxy.totalGb) * 100)) : 0
                      const barColor    = pct >= 95 ? '#f87171' : pct >= 75 ? '#fbbf24' : '#34d399'
                      return (
                        <div key={proxy.id} style={{ border: `1px solid color-mix(in srgb,${isAlive ? AC : '#f87171'} 20%,rgba(255,255,255,.06))`, borderRadius: 14, overflow: 'hidden' }}>
                          <div style={{ padding: '12px 16px', background: `color-mix(in srgb,${isAlive ? AC : '#f87171'} 5%,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 13.5, color: '#f4f2f8' }}>{proxy.name || proxy.host}</div>
                              <div style={{ fontSize: 11, color: 'rgba(244,242,248,.4)', marginTop: 1 }}>Proxy Residencial Rotativa</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: isAlive ? 'rgba(52,211,153,.12)' : 'rgba(248,113,113,.1)', border: `1px solid ${isAlive ? 'rgba(52,211,153,.25)' : 'rgba(248,113,113,.2)'}`, borderRadius: 999, padding: '3px 9px', fontSize: 10.5, fontWeight: 700, color: isAlive ? '#34d399' : '#f87171', fontFamily: "'JetBrains Mono',monospace" }}>
                                <span style={{ width: 4, height: 4, borderRadius: '50%', background: isAlive ? '#34d399' : '#f87171', display: 'inline-block' }} />
                                {checkerDone ? (isAlive ? 'ativa' : 'inativa') : proxy.status}
                              </div>
                              {checkerDone && !isAlive && (
                                <button
                                  disabled={isRemoving}
                                  onClick={async () => {
                                    if (!confirm('Remover esta proxy inativa?')) return
                                    setModalRemoving(proxy.id)
                                    try {
                                      const r = await fetch(`/api/proxies/${proxy.id}`, { method: 'DELETE' })
                                      if (r.ok) setModalProxies(prev => prev.filter(p => p.id !== proxy.id))
                                      else { const d = await r.json(); alert(d.error ?? 'Erro ao remover.') }
                                    } finally { setModalRemoving(null) }
                                  }}
                                  style={{ background: 'rgba(248,113,113,.15)', border: '1px solid rgba(248,113,113,.3)', borderRadius: 7, padding: '4px 9px', color: '#f87171', cursor: 'pointer', fontSize: 10.5, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", opacity: isRemoving ? .5 : 1 }}
                                >
                                  {isRemoving ? '...' : 'Remover'}
                                </button>
                              )}
                            </div>
                          </div>
                          <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(244,242,248,.38)', marginBottom: 5, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.1em', textTransform: 'uppercase' }}>
                              <span>Uso de GB</span>
                              <span>{proxy.usedGb.toFixed(2)} / {proxy.totalGb} GB</span>
                            </div>
                            <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,.07)', overflow: 'hidden', marginBottom: 3 }}>
                              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: `linear-gradient(90deg,${barColor},${barColor}aa)` }} />
                            </div>
                            <div style={{ fontSize: 10, color: 'rgba(244,242,248,.3)', textAlign: 'right' }}>{pct}% usado</div>
                          </div>
                          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                            <div style={{ fontSize: 9.5, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.12em', color: 'rgba(244,242,248,.3)', textTransform: 'uppercase', marginBottom: 7 }}>Credenciais de conexão</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <div style={{ flex: 1, background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 9, padding: '9px 12px', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'rgba(244,242,248,.7)', wordBreak: 'break-all', lineHeight: 1.5 }}>{connStr}</div>
                              <button onClick={() => { navigator.clipboard.writeText(connStr).then(() => { setModalCopied(proxy.id); setTimeout(() => setModalCopied(null), 2000) }) }}
                                style={{ flexShrink: 0, background: isCopied ? 'rgba(52,211,153,.15)' : 'rgba(168,85,247,.15)', border: `1px solid ${isCopied ? 'rgba(52,211,153,.3)' : 'rgba(168,85,247,.3)'}`, borderRadius: 9, padding: '9px 12px', color: isCopied ? '#34d399' : AC, cursor: 'pointer', fontSize: 10.5, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", whiteSpace: 'nowrap' }}>
                                {isCopied ? 'Copiado!' : 'Copiar'}
                              </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                              {[['Host', proxy.host], ['Porta', String(proxy.port)], ['Usuário', proxy.proxyUser], ['Senha', proxy.proxyPass]].map(([k, v]) => (
                                <div key={k} style={{ background: 'rgba(0,0,0,.2)', borderRadius: 7, padding: '7px 10px' }}>
                                  <div style={{ fontSize: 9, color: 'rgba(244,242,248,.28)', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 2 }}>{k}</div>
                                  <div style={{ fontSize: 11, color: '#f4f2f8', fontFamily: "'JetBrains Mono',monospace", wordBreak: 'break-all' }}>{v}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <Link href="/dashboard" onClick={() => setModalOpen(false)} style={{ display: 'block', textAlign: 'center', background: AC, color: '#0a0612', fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 13.5, padding: '11px 0', borderRadius: 12, textDecoration: 'none', marginTop: 4 }}>
                      Ir para o dashboard
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
                          <button onClick={saveName} disabled={nameSaving} style={{ background: AC, color: '#0a0612', fontWeight: 600, fontSize: 12.5, padding: '8px 13px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>{nameSaving ? '...' : 'Salvar'}</button>
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
                          <button onClick={() => setShowPwd(s => !s)} style={{ background: 'none', border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, padding: '5px 11px', color: 'rgba(244,242,248,.65)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.08em' }}>
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
                              style={{ background: AC, color: '#0a0612', fontWeight: 600, fontSize: 13.5, padding: '10px', borderRadius: 9, border: 'none', cursor: 'pointer', opacity: (pwdSaving || !curPwd || nxtPwd.length < 6) ? .5 : 1 }}>
                              {pwdSaving ? 'Salvando...' : 'Confirmar'}
                            </button>
                            {pwdMsg && <div style={{ fontSize: 12, color: pwdMsg.ok ? '#34d399' : '#f87171' }}>{pwdMsg.text}</div>}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '4px 0' }} />

                    <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 13.5, fontWeight: 600, padding: '2px 0', fontFamily: "'Manrope',sans-serif" }}>
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
