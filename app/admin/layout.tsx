'use client'
import './admin.css'
import { SessionProvider, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'

type BadgeKey = 'orders' | 'partnerClaims' | 'payouts'
interface NavItem { href: string; icon: string; label: string; exact?: boolean; badge?: BadgeKey }

// Menu raggruppato per area di lavoro
const GROUPS: { label: string; items: NavItem[] }[] = [
  { label: 'Vendite', items: [
    { href: '/admin',           icon: '📊', label: 'Dashboard', exact: true },
    { href: '/admin/orders',    icon: '🧾', label: 'Ordini', badge: 'orders' },
    { href: '/admin/products',  icon: '📦', label: 'Prodotti' },
    { href: '/admin/discounts', icon: '🎟️', label: 'Codici sconto' },
  ] },
  { label: 'Clienti', items: [
    { href: '/admin/members',    icon: '👥', label: 'Membri' },
    { href: '/admin/affiliates', icon: '🤝', label: 'Affiliati', badge: 'payouts' },
    { href: '/admin/partner',    icon: '🏆', label: 'Premi partner', badge: 'partnerClaims' },
    { href: '/admin/news',       icon: '📢', label: 'Novità e push' },
  ] },
  { label: 'Gestione', items: [
    { href: '/admin/warehouse',   icon: '🏭', label: 'Magazzino' },
    { href: '/admin/bulk-images', icon: '🖼️', label: 'Immagini' },
  ] },
]
const ALL = GROUPS.flatMap(g => g.items)
const TABS: NavItem[] = [ALL[0], ALL[1], ALL[2]]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [badges, setBadges] = useState<Partial<Record<BadgeKey, number>>>({})

  useEffect(() => { setDrawerOpen(false) }, [pathname])

  // Contatori "da fare": all'apertura, a ogni cambio pagina e ogni minuto
  const loadBadges = useCallback(() => {
    fetch('/api/admin/badges').then(r => r.ok ? r.json() : null).then(d => d && setBadges(d)).catch(() => {})
  }, [])
  useEffect(() => {
    if (pathname === '/admin/login') return
    loadBadges()
    const t = setInterval(loadBadges, 60_000)
    return () => clearInterval(t)
  }, [pathname, loadBadges])

  if (pathname === '/admin/login') {
    return (
      <SessionProvider>
        <div style={{ minHeight: '100dvh', background: 'var(--bg)', color: 'var(--text)' }}>{children}</div>
      </SessionProvider>
    )
  }

  const isActive = (n: NavItem) => n.exact ? pathname === n.href : pathname.startsWith(n.href)
  const badge = (k?: BadgeKey) => (k && badges[k] ? <span className="adm-nav-badge">{badges[k]! > 99 ? '99+' : badges[k]}</span> : null)
  const moreBadge = (badges.partnerClaims ?? 0) + (badges.payouts ?? 0)

  const sidebar = (cls: string) => (
    <aside className={`adm-side ${cls}`}>
      <div className="adm-brand">
        <div className="adm-brand-logo">⚡</div>
        <div>
          <div className="adm-brand-title">Magic Trip House</div>
          <div className="adm-brand-sub">Pannello admin</div>
        </div>
      </div>
      <nav className="adm-nav">
        {GROUPS.map(g => (
          <div key={g.label} className="adm-nav-group">
            <div className="adm-nav-label">{g.label}</div>
            {g.items.map(n => (
              <Link key={n.href} href={n.href} className={`adm-nav-link${isActive(n) ? ' active' : ''}`}>
                <span className="adm-nav-ico">{n.icon}</span>
                <span>{n.label}</span>
                {badge(n.badge)}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="adm-side-foot">
        <Link href="/" className="adm-nav-link" target="_blank">
          <span className="adm-nav-ico">🌐</span><span>Apri il sito</span>
        </Link>
        <button onClick={() => signOut({ callbackUrl: '/admin/login' })} className="adm-nav-link danger">
          <span className="adm-nav-ico">⏻</span><span>Esci</span>
        </button>
      </div>
    </aside>
  )

  return (
    <SessionProvider>
      <div className="adm">
        {sidebar('desk')}

        <div className={`adm-backdrop${drawerOpen ? ' open' : ''}`} onClick={() => setDrawerOpen(false)} />
        {sidebar(`drawer${drawerOpen ? ' open' : ''}`)}

        <header className="adm-top">
          <div className="adm-brand-logo" style={{ width: 32, height: 32, borderRadius: 10, fontSize: '.95rem' }}>⚡</div>
          <span className="adm-top-title">Magic Trip House <span style={{ fontFamily: 'inherit', fontSize: '.7rem', color: 'var(--a-faint)', fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase' }}>admin</span></span>
          <Link href="/" target="_blank" className="adm-icon-btn" aria-label="Apri il sito">🌐</Link>
        </header>

        <main className="adm-main">
          <div className="adm-content">{children}</div>
        </main>

        {/* Tab bar mobile: le 3 sezioni più usate + menu completo */}
        <nav className="adm-tabbar">
          {TABS.map(t => (
            <Link key={t.href} href={t.href} className={`adm-tab${isActive(t) ? ' active' : ''}`}>
              <span className="ico">{t.icon}</span>{t.label}{badge(t.badge)}
            </Link>
          ))}
          <button className={`adm-tab${drawerOpen ? ' active' : ''}`} onClick={() => setDrawerOpen(true)}>
            <span className="ico">☰</span>Menu
            {moreBadge > 0 && <span className="adm-nav-badge">{moreBadge}</span>}
          </button>
        </nav>
      </div>
    </SessionProvider>
  )
}
