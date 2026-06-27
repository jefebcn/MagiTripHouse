'use client'
import { SessionProvider, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const NAV = [
  { href: '/admin',            icon: '📊', label: 'Dashboard', exact: true },
  { href: '/admin/products',   icon: '📦', label: 'Prodotti'  },
  { href: '/admin/orders',     icon: '📋', label: 'Ordini'    },
  { href: '/admin/news',       icon: '📢', label: 'Novità'    },
  { href: '/admin/members',    icon: '👥', label: 'Membri'    },
  { href: '/admin/affiliates', icon: '🤝', label: 'Affiliati' },
  { href: '/admin/bulk-images',icon: '🖼️', label: 'Immagini'  },
]

function titleFor(pathname: string): string {
  const match = [...NAV].reverse().find(n => n.exact ? pathname === n.href : pathname.startsWith(n.href))
  return match?.label ?? 'Admin'
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Chiudi il drawer ad ogni cambio pagina
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  const isLogin = pathname === '/admin/login'

  if (isLogin) {
    return (
      <SessionProvider>
        <div style={{ minHeight: '100dvh', background: 'var(--bg)', color: 'var(--text)' }}>
          {children}
        </div>
      </SessionProvider>
    )
  }

  const isActive = (n: typeof NAV[number]) => n.exact ? pathname === n.href : pathname.startsWith(n.href)

  const SidebarContent = (
    <>
      <div className="admin-brand">
        <span className="admin-brand-mark">⚙️</span>
        <div>
          <div className="admin-brand-title">Magic Trip House</div>
          <div className="admin-brand-sub">Pannello Admin</div>
        </div>
      </div>

      <nav className="admin-nav">
        {NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={`admin-nav-link${isActive(n) ? ' active' : ''}`}
          >
            <span className="admin-nav-icon">{n.icon}</span>
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>

      <div className="admin-sidebar-foot">
        <Link href="/" className="admin-nav-link" target="_blank">
          <span className="admin-nav-icon">🌐</span>
          <span>Vedi sito</span>
        </Link>
        <button onClick={() => signOut({ callbackUrl: '/admin/login' })} className="admin-logout">
          <span className="admin-nav-icon">🚪</span>
          <span>Esci</span>
        </button>
      </div>
    </>
  )

  return (
    <SessionProvider>
      <div className="admin-shell">
        {/* Sidebar desktop */}
        <aside className="admin-sidebar">{SidebarContent}</aside>

        {/* Drawer mobile + backdrop */}
        <div
          className={`admin-backdrop${drawerOpen ? ' open' : ''}`}
          onClick={() => setDrawerOpen(false)}
        />
        <aside className={`admin-drawer${drawerOpen ? ' open' : ''}`}>{SidebarContent}</aside>

        {/* Topbar mobile */}
        <header className="admin-topbar">
          <button className="admin-burger" onClick={() => setDrawerOpen(true)} aria-label="Menu">
            <span /><span /><span />
          </button>
          <span className="admin-topbar-title">{titleFor(pathname)}</span>
        </header>

        {/* Contenuto */}
        <main className="admin-main">
          <div className="admin-content">{children}</div>
        </main>
      </div>

      <style>{`
        .admin-shell { min-height: 100dvh; background: var(--bg); color: var(--text); position: relative; z-index: 1; }

        /* ─── Sidebar (desktop) ─── */
        .admin-sidebar, .admin-drawer {
          width: 248px; display: flex; flex-direction: column;
          background: rgba(13,17,13,.92); backdrop-filter: blur(12px);
          border-right: 1px solid var(--border);
        }
        .admin-sidebar {
          position: fixed; top: 0; left: 0; bottom: 0; z-index: 50;
        }
        .admin-brand {
          display: flex; align-items: center; gap: 11px;
          padding: 20px 18px; border-bottom: 1px solid var(--border);
        }
        .admin-brand-mark { font-size: 1.6rem; }
        .admin-brand-title { font-family: 'Fredoka One', cursive; font-size: .98rem; line-height: 1.1; }
        .admin-brand-sub { font-size: .66rem; color: var(--muted); margin-top: 3px; letter-spacing: .4px; text-transform: uppercase; }

        .admin-nav { display: flex; flex-direction: column; gap: 3px; padding: 14px 12px; flex: 1; overflow-y: auto; }
        .admin-nav-link {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 13px; border-radius: 11px;
          color: var(--muted); text-decoration: none;
          font-size: .9rem; font-weight: 600; font-family: inherit;
          border: 1px solid transparent; transition: all .15s; cursor: pointer;
          background: none; width: 100%; text-align: left;
        }
        .admin-nav-link:hover { background: var(--bg3); color: var(--text); }
        .admin-nav-link.active {
          background: rgba(61,255,110,.1); color: var(--green);
          border-color: rgba(61,255,110,.3);
          box-shadow: inset 3px 0 0 var(--green);
        }
        .admin-nav-icon { font-size: 1.1rem; width: 22px; text-align: center; flex-shrink: 0; }

        .admin-sidebar-foot { padding: 12px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 3px; }
        .admin-logout {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 13px; border-radius: 11px;
          color: var(--red); background: none; border: 1px solid transparent;
          font-size: .9rem; font-weight: 600; font-family: inherit; cursor: pointer; width: 100%; text-align: left;
          transition: all .15s;
        }
        .admin-logout:hover { background: rgba(232,59,59,.1); border-color: rgba(232,59,59,.25); }

        /* ─── Drawer (mobile) ─── */
        .admin-drawer {
          position: fixed; top: 0; left: 0; bottom: 0; z-index: 70;
          transform: translateX(-100%); transition: transform .25s ease;
        }
        .admin-drawer.open { transform: translateX(0); box-shadow: 0 0 40px rgba(0,0,0,.6); }
        .admin-backdrop {
          position: fixed; inset: 0; z-index: 60;
          background: rgba(0,0,0,.55); opacity: 0; pointer-events: none; transition: opacity .25s;
        }
        .admin-backdrop.open { opacity: 1; pointer-events: auto; }

        /* ─── Topbar (mobile) ─── */
        .admin-topbar {
          position: sticky; top: 0; z-index: 40;
          display: flex; align-items: center; gap: 14px;
          padding: 12px 16px;
          background: rgba(8,12,8,.96); backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border);
        }
        .admin-topbar-title { font-family: 'Fredoka One', cursive; font-size: 1.1rem; }
        .admin-burger {
          display: flex; flex-direction: column; justify-content: center; gap: 4px;
          width: 38px; height: 38px; padding: 9px; border-radius: 10px;
          background: var(--bg3); border: 1px solid var(--border); cursor: pointer;
        }
        .admin-burger span { display: block; height: 2px; background: var(--text); border-radius: 2px; }

        /* ─── Main content ─── */
        .admin-main { padding-bottom: 60px; }
        .admin-content { width: 100%; max-width: 1180px; margin: 0 auto; padding: 24px 20px 40px; }

        /* ─── Desktop layout ─── */
        @media (min-width: 880px) {
          .admin-topbar { display: none; }
          .admin-drawer, .admin-backdrop { display: none; }
          .admin-main { margin-left: 248px; }
          .admin-content { padding: 32px 36px 60px; }
        }
        @media (max-width: 879px) {
          .admin-sidebar { display: none; }
        }
      `}</style>
    </SessionProvider>
  )
}
