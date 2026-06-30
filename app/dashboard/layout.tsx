'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { signOut } from '@/lib/firebase/auth-actions'
import { CheckoutModal } from '@/components/CheckoutModal'

const AC  = '#a855f7'
const AC2 = 'color-mix(in srgb,#a855f7 45%,#ffffff)'

const navBase: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '11px 14px', borderRadius: 11,
  fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
  border: 'none', width: '100%', textAlign: 'left',
  fontFamily: "'Manrope',sans-serif", textDecoration: 'none',
}
const navIdle: React.CSSProperties   = { ...navBase, background: 'transparent', color: 'rgba(244,242,248,.6)' }
const navActive: React.CSSProperties = { ...navBase, background: `color-mix(in srgb,${AC} 14%,transparent)`, color: '#fff', fontWeight: 600 }
const navDim: React.CSSProperties    = { ...navBase, background: 'transparent', color: 'rgba(244,242,248,.38)', cursor: 'default' }

function NavLink({ href, icon, label, active, onClick }: { href: string; icon: React.ReactNode; label: string; active: boolean; onClick?: () => void }) {
  return (
    <Link href={href} className="dash-nav-link" style={active ? navActive : navIdle} onClick={onClick}>
      {icon}{label}
    </Link>
  )
}

function NavDim({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span style={navDim}>{icon}{label}</span>
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname      = usePathname()
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const { user }      = useAuth()
  const [sidebarOpen,   setSidebarOpen]   = useState(false)
  const [showCheckout,  setShowCheckout]  = useState(false)

  useEffect(() => {
    if (searchParams.get('checkout') === '1') {
      setShowCheckout(true)
      // remove the param from the URL without a navigation
      const url = new URL(window.location.href)
      url.searchParams.delete('checkout')
      window.history.replaceState(null, '', url.toString())
    }
  }, [searchParams])

  const email   = user?.email ?? ''
  const initial = email ? email[0].toUpperCase() : 'U'
  const is = (seg: string) => pathname === `/dashboard/${seg}` || (seg === 'proxies' && pathname === '/dashboard') || pathname.startsWith(`/dashboard/${seg}/`)

  const titles: Record<string, string> = { proxies: 'Minhas Proxys', consumo: 'Consumo', pedidos: 'Pedidos', perfil: 'Meu Perfil' }
  const seg = pathname.split('/').pop() ?? 'proxies'
  const pageTitle = titles[seg] ?? 'Painel'

  const closeSidebar = () => setSidebarOpen(false)

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="dash-layout" style={{ display: 'flex', minHeight: '100vh' }}>

      {/* OVERLAY mobile */}
      <div
        className={`dash-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* SIDEBAR */}
      <aside
        className={`dash-sidebar${sidebarOpen ? ' open' : ''}`}
        style={{ width: 250, flexShrink: 0, position: 'sticky', top: 0, alignSelf: 'flex-start', height: '100vh', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,.07)', background: 'rgba(13,11,18,.97)', backdropFilter: 'blur(10px)' }}
      >
        <div style={{ padding: '22px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', filter: `drop-shadow(0 0 10px color-mix(in srgb,${AC} 70%,transparent))` }}>
              <svg width="26" height="26" viewBox="0 0 34 34" fill="none">
                <circle cx="17" cy="17" r="14.5" stroke={AC} strokeWidth="2" opacity=".35"/>
                <path d="M17 2.5a14.5 14.5 0 0 1 0 29" stroke={AC2} strokeWidth="2.6" strokeLinecap="round"/>
                <circle cx="17" cy="17" r="4.6" fill={AC}/>
              </svg>
            </span>
            <span style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: '-.02em' }}>
              LUMA<span style={{ color: AC2 }}> PROXYS</span>
            </span>
          </div>
          {/* Close button — só aparece no mobile via CSS */}
          <button
            className="dash-hamburger"
            onClick={closeSidebar}
            aria-label="Fechar menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 14px' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '.18em', color: 'rgba(244,242,248,.32)', textTransform: 'uppercase', padding: '10px 8px 8px' }}>Menu</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <NavLink href="/dashboard/proxies" active={is('proxies')} label="Minhas Proxys" onClick={closeSidebar} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><path d="M7 7h.01M7 17h.01"/></svg>}/>
            <NavLink href="/dashboard/consumo"  active={is('consumo')}  label="Consumo"       onClick={closeSidebar} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>}/>
            <button onClick={() => { setShowCheckout(true); closeSidebar() }} style={navIdle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
              Recarga
            </button>
            <NavLink href="/dashboard/pedidos"  active={is('pedidos')}  label="Pedidos"       onClick={closeSidebar} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>}/>
            <NavDim label="Datacenter" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 4v16"/></svg>}/>
            <NavDim label="Cashback"   icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18M7 15h2M12 15h4M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z"/></svg>}/>
            <NavDim label="Afiliados"  icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5Z"/></svg>}/>
            <NavLink href="/dashboard/perfil" active={is('perfil')} label="Meu Perfil" onClick={closeSidebar} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>}/>
            <NavDim label="Ajuda"      icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3M12 17h.01"/></svg>}/>
          </div>

          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '.18em', color: 'rgba(244,242,248,.32)', textTransform: 'uppercase', padding: '18px 8px 8px' }}>Desenvolvedor</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <NavDim label="API" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 8-4 4 4 4M16 8l4 4-4 4"/></svg>}/>
          </div>
        </div>

        <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 11, fontSize: 13.5, fontWeight: 600, color: 'rgba(244,242,248,.55)', textDecoration: 'none' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3.6-7.2L21 4"/></svg>
            Grupo WhatsApp
          </a>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 11, fontSize: 13.5, fontWeight: 600, color: 'rgba(244,242,248,.55)', textDecoration: 'none' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>
            Ver a Loja
          </Link>
          <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 11, fontSize: 13.5, fontWeight: 600, color: 'rgba(244,242,248,.55)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: "'Manrope',sans-serif" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Sair
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* TOPBAR */}
        <div className="dash-topbar" style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 32px', borderBottom: '1px solid rgba(255,255,255,.07)', background: 'rgba(8,7,12,.82)', backdropFilter: 'blur(14px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Hamburger — só visível mobile */}
            <button
              className="dash-hamburger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            </button>
            <div className="dash-page-title" style={{ fontFamily: "'Archivo',sans-serif", fontWeight: 600, fontSize: 15, color: 'rgba(244,242,248,.8)' }}>{pageTitle}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ position: 'relative', display: 'inline-flex', color: 'rgba(244,242,248,.6)' }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>
              <span style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: AC, color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>1</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.025)', borderRadius: 999, padding: '6px 12px 6px 6px' }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${AC2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#0a0612', flexShrink: 0 }}>{initial}</span>
              <span className="dash-user-email" style={{ fontSize: 13, color: 'rgba(244,242,248,.8)' }}>{email || 'carregando...'}</span>
            </div>
          </div>
        </div>

        <div className="dash-content" style={{ padding: '30px 32px 60px', maxWidth: 1240, width: '100%' }}>
          <div key={pathname} style={{ animation: 'lumaRise .35s ease both' }}>
            {children}
          </div>
        </div>
      </main>

      {showCheckout && user && (
        <CheckoutModal user={user} onClose={() => setShowCheckout(false)} />
      )}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  )
}
