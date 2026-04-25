'use client'
import React from 'react'
import { useUIStore } from '@/store/uiStore'
import BottomNav from '@/components/layout/BottomNav'
import AnnouncementBanner from '@/components/layout/AnnouncementBanner'
import Marquee from '@/components/layout/Marquee'
import Header from '@/components/layout/Header'
import CategoryFilter from '@/components/catalog/CategoryFilter'
import SearchBar from '@/components/catalog/SearchBar'
import ProductGrid from '@/components/catalog/ProductGrid'
import CartDrawer from '@/components/panels/CartDrawer'
import ProductDetail from '@/components/panels/ProductDetail'
import Lightbox from '@/components/panels/Lightbox'
import { useTelegram } from '@/hooks/useTelegram'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// LED accent line
function LedLine() {
  return (
    <div style={{
      height: 2,
      background: 'linear-gradient(90deg,transparent,var(--green),rgba(245,200,66,.6),var(--green),transparent)',
      boxShadow: '0 0 8px rgba(61,255,110,.4)',
    }} />
  )
}

export default function Home() {
  const { view, isLoggedIn, setView } = useUIStore()
  useTelegram()

  // Redirect gated views to account/login if not logged in
  const gated = (content: React.ReactNode) =>
    isLoggedIn ? content : <AuthGate />

  return (
    <main style={{ minHeight: '100dvh', maxWidth: 480, margin: '0 auto', position: 'relative' }}>
      <LedLine />

      {/* Catalog — always visible */}
      <div style={{ display: view === 'catalog' ? 'block' : 'none' }}>
        <Header />
        <AnnouncementBanner />
        <Marquee />
        <CategoryFilter />
        <SearchBar />
        <ProductGrid />
      </div>

      {/* Canale */}
      <div style={{ display: view === 'news' ? 'block' : 'none', padding: '16px 16px 100px' }}>
        {gated(<NewsView />)}
      </div>

      {/* Ordini */}
      <div style={{ display: view === 'orders' ? 'block' : 'none', padding: '16px 16px 100px' }}>
        {gated(<OrdersView />)}
      </div>

      {/* Account */}
      <div style={{ display: view === 'account' ? 'block' : 'none', padding: '16px 16px 100px' }}>
        {isLoggedIn ? <AccountView /> : <AuthView />}
      </div>

      {/* Affiliati */}
      <div style={{ display: view === 'affiliates' ? 'block' : 'none', padding: '16px 16px 100px' }}>
        {gated(<AffiliatesView />)}
      </div>

      <CartDrawer />
      <ProductDetail />
      <Lightbox />
      <BottomNav />
    </main>
  )
}

// ---- Inline simple views ----

function NewsView() {
  const [subscribed, setSubscribed] = React.useState(false)
  const [subLoading, setSubLoading] = React.useState(false)
  const [hasPush, setHasPush] = React.useState(false)
  const [memberCount, setMemberCount] = React.useState<number | null>(null)
  const [inside, setInside] = React.useState(false)
  const [pwaBannerDismissed, setPwaBannerDismissed] = React.useState(false)
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = React.useState(false)

  React.useEffect(() => {
    fetch('/api/push/count').then(r => r.json()).then(d => setMemberCount(d.count)).catch(() => {})
    const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
    setHasPush(supported)
    if (supported) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) { setSubscribed(true); setInside(true) }
        })
      )
    }
    // Check if already installed as PWA
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed') === '1'
    setPwaBannerDismissed(dismissed)
    // Capture install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function joinChannel() {
    setSubLoading(true)
    try {
      if (hasPush) {
        const reg = await navigator.serviceWorker.ready
        const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        const padding = '='.repeat((4 - (key.length % 4)) % 4)
        const base64 = (key + padding).replace(/-/g, '+').replace(/_/g, '/')
        const raw = window.atob(base64)
        const arr = new Uint8Array(raw.length)
        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: arr })
        await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })
        setSubscribed(true)
        setMemberCount(c => (c ?? 0) + 1)
      }
    } catch { /* permission denied — entra comunque in view-only */ }
    setInside(true)
    setSubLoading(false)
  }

  async function leaveChannel() {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
        setMemberCount(c => Math.max(0, (c ?? 1) - 1))
      }
    } catch { /* noop */ }
    setSubscribed(false)
    setInside(false)
  }

  /* ---- LANDING del canale ---- */
  if (!inside) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32, gap: 0 }}>
      {/* Avatar canale */}
      <div style={{
        width: 88, height: 88, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, rgba(61,255,110,.35), rgba(61,255,110,.08))',
        border: '2px solid rgba(61,255,110,.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2.6rem', boxShadow: '0 0 32px rgba(61,255,110,.2)',
        marginBottom: 18,
      }}>📡</div>

      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem', letterSpacing: '.4px', textAlign: 'center' }}>
        MagiTripHouse
      </div>
      <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 6, textAlign: 'center' }}>
        Canale ufficiale · Novità, offerte & aggiornamenti esclusivi
      </div>

      {/* Contatore iscritti */}
      <div style={{
        marginTop: 18, display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '8px 18px',
      }}>
        <span style={{ fontSize: '1rem' }}>👥</span>
        <span style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--green)' }}>
          {memberCount ?? '—'}
        </span>
        <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>iscritti</span>
      </div>

      <button
        onClick={joinChannel}
        disabled={subLoading}
        style={{
          marginTop: 28, padding: '14px 40px',
          borderRadius: 14, fontFamily: 'inherit', fontWeight: 700,
          fontSize: '1rem', cursor: 'pointer', transition: '.2s',
          background: 'rgba(61,255,110,.18)', border: '1.5px solid rgba(61,255,110,.5)',
          color: 'var(--green)', boxShadow: '0 0 20px rgba(61,255,110,.15)',
        }}
      >
        {subLoading ? '...' : '📡 Entra nel Canale'}
      </button>

      <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 12, textAlign: 'center', opacity: .7 }}>
        Attiva le notifiche per non perderti nulla
      </div>
    </div>
  )

  async function installPwa() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setDeferredPrompt(null)
    }
  }

  function dismissPwaBanner() {
    sessionStorage.setItem('pwa_banner_dismissed', '1')
    setPwaBannerDismissed(true)
  }

  /* ---- INTERNO del canale ---- */
  const showPwaBanner = !isStandalone && !pwaBannerDismissed

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header interno */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid rgba(61,255,110,.15)',
        borderRadius: 'var(--radius)', padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: showPwaBanner ? 14 : 20,
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(61,255,110,.12)', border: '1.5px solid rgba(61,255,110,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
        }}>📡</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.05rem' }}>MagiTripHouse</div>
          <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 2 }}>
            👥 {memberCount ?? '—'} iscritti · {subscribed ? '🔔 Notifiche attive' : '🔕 Solo lettura'}
          </div>
        </div>
        <button
          onClick={leaveChannel}
          style={{
            background: 'rgba(232,59,59,.1)', border: '1px solid rgba(232,59,59,.25)',
            borderRadius: 20, padding: '6px 14px', color: 'var(--red)',
            fontFamily: 'inherit', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer',
          }}
        >Esci</button>
      </div>

      {/* PWA install banner */}
      {showPwaBanner && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(61,255,110,.1), rgba(245,200,66,.07))',
          border: '1px solid rgba(61,255,110,.3)',
          borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: 18,
          position: 'relative',
        }}>
          <button
            onClick={dismissPwaBanner}
            style={{
              position: 'absolute', top: 10, right: 12, background: 'none', border: 'none',
              color: 'var(--muted)', fontSize: '1rem', cursor: 'pointer', lineHeight: 1,
            }}
          >✕</button>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingRight: 20 }}>
            <span style={{ fontSize: '1.8rem', lineHeight: 1, flexShrink: 0 }}>📲</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 4, color: 'var(--green)' }}>
                Installa l&apos;app sul telefono!
              </div>
              <div style={{ fontSize: '.78rem', color: '#c8e6cb', lineHeight: 1.55 }}>
                Aggiungi MagiTripHouse alla schermata Home per accedere subito al canale e non perderti nessuna novità.
                Poi attiva le notifiche push per ricevere aggiornamenti in tempo reale.
              </div>
              {deferredPrompt ? (
                <button
                  onClick={installPwa}
                  style={{
                    marginTop: 10, padding: '8px 18px', borderRadius: 10,
                    background: 'rgba(61,255,110,.2)', border: '1px solid rgba(61,255,110,.45)',
                    color: 'var(--green)', fontFamily: 'inherit', fontWeight: 700,
                    fontSize: '.8rem', cursor: 'pointer',
                  }}
                >📲 Installa ora</button>
              ) : (
                <div style={{ marginTop: 8, fontSize: '.73rem', color: 'var(--muted)', opacity: .85 }}>
                  iOS: tocca <strong style={{ color: 'var(--text)' }}>Condividi</strong> → <strong style={{ color: 'var(--text)' }}>Aggiungi a Home</strong>
                  <br />Android: menu browser → <strong style={{ color: 'var(--text)' }}>Aggiungi a schermata Home</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <NewsFeed />
    </div>
  )
}

function NewsFeed() {
  const [news, setNews] = React.useState<NewsItem[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch('/api/news')
      .then((r) => r.json())
      .then((data) => { setNews(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', height: 90, opacity: .5, animation: 'skeleton-shine 1.4s infinite' }} />
      ))}
    </div>
  )

  if (!news.length) return (
    <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>
      <div style={{ fontSize: '3rem', marginBottom: 10 }}>📭</div>
      <div style={{ fontSize: '.88rem' }}>Nessun messaggio ancora</div>
      <div style={{ fontSize: '.75rem', marginTop: 6, opacity: .6 }}>Iscriviti per ricevere le prime novità</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {news.map((item, i) => (
        <div
          key={item.id}
          style={{
            background: 'var(--card)', border: '1px solid rgba(61,255,110,.1)',
            borderRadius: 'var(--radius)', padding: '16px 16px 14px',
            animation: 'fadeInUp .3s ease both', animationDelay: `${i * 0.05}s`,
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* left accent bar */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
            background: 'linear-gradient(180deg, var(--green), rgba(61,255,110,.2))',
          }} />
          <div style={{ paddingLeft: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{item.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', letterSpacing: '.2px' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: 1 }}>
                  {new Date(item.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            <div style={{ color: '#c8e6cb', fontSize: '.82rem', lineHeight: 1.65 }}>{item.content}</div>
            {item.productLink && (
              <a
                href={item.productLink}
                target="_blank"
                rel="noopener"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  marginTop: 10, color: 'var(--green)', fontSize: '.78rem',
                  fontWeight: 700, textDecoration: 'none',
                }}
              >
                🛒 Scopri il prodotto →
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

interface NewsItem {
  id: string; title: string; content: string; emoji: string; productLink?: string; createdAt: string
}

function OrdersView() {
  const [orders, setOrders] = React.useState<OrderItem[]>([])
  React.useEffect(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('tp_orders') : null
    if (saved) setOrders(JSON.parse(saved))
  }, [])

  if (!orders.length) return (
    <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 48, fontSize: '.88rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: 8 }}>📋</div>Nessun ordine effettuato
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.4rem', marginBottom: 8 }}>📋 I Miei Ordini</div>
      {orders.map((o) => (
        <div key={o.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.92rem' }}>{o.id}</span>
            <span style={{ fontSize: '.75rem', color: 'var(--green)' }}>€{o.total}</span>
          </div>
          <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{o.date}</div>
        </div>
      ))}
    </div>
  )
}

interface OrderItem { id: string; total: number; date: string }

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

function AccountView() {
  const { userName, userHandle, login, logout } = useUIStore()
  const [editing, setEditing] = React.useState(false)
  const [inputVal, setInputVal] = React.useState('')
  const [pushEnabled, setPushEnabled] = React.useState(false)
  const [pushLoading, setPushLoading] = React.useState(false)
  const [hasSW, setHasSW] = React.useState(false)

  React.useEffect(() => {
    setInputVal(userName)
    const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
    setHasSW(supported)
    if (supported) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => setPushEnabled(!!sub))
      )
    }
  }, [userName])

  function saveName() {
    const t = inputVal.trim()
    if (t) login(t, userHandle)
    setEditing(false)
  }

  async function togglePush() {
    setPushLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      if (pushEnabled) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
        }
        setPushEnabled(false)
      } else {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) })
        await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })
        setPushEnabled(true)
      }
    } catch { /* permission denied or not supported */ }
    setPushLoading(false)
  }

  const initial = userName ? userName[0].toUpperCase() : '?'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Avatar + nome */}
      <div style={{
        background: 'var(--card)', border: '1px solid rgba(61,255,110,.15)',
        borderRadius: 'var(--radius)', padding: '28px 20px 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 82, height: 82, borderRadius: '50%', flexShrink: 0,
          background: 'var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.4rem', fontWeight: 800, color: '#000',
          fontFamily: "'Fredoka One', cursive",
          boxShadow: 'var(--led-green)',
        }}>
          {initial}
        </div>

        {editing ? (
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <input
              autoFocus
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              placeholder="Il tuo nome o username..."
              style={{
                flex: 1, background: 'var(--bg3)', borderRadius: 10, outline: 'none',
                border: '1px solid rgba(61,255,110,.4)', padding: '11px 14px',
                color: 'var(--text)', fontSize: '.9rem', fontFamily: 'inherit',
              }}
            />
            <button onClick={saveName} style={{
              background: 'rgba(61,255,110,.15)', border: '1px solid rgba(61,255,110,.4)',
              borderRadius: 10, padding: '0 18px', color: 'var(--green)',
              fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer', fontSize: '1.1rem',
            }}>✓</button>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.35rem', letterSpacing: '.3px' }}>
              {userName}
            </div>
            {userHandle && (
              <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: -6 }}>@{userHandle}</div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setEditing(true); setInputVal(userName) }}
                style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 20, padding: '7px 18px', color: 'var(--muted)',
                  fontFamily: 'inherit', fontSize: '.8rem', cursor: 'pointer',
                }}
              >✏️ Modifica nome</button>
              <button
                onClick={logout}
                style={{
                  background: 'rgba(232,59,59,.08)', border: '1px solid rgba(232,59,59,.25)',
                  borderRadius: 20, padding: '7px 14px', color: 'var(--red)',
                  fontFamily: 'inherit', fontSize: '.8rem', cursor: 'pointer',
                }}
              >Esci</button>
            </div>
          </>
        )}
      </div>

      {/* Push notifications */}
      {hasSW && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '16px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '.9rem' }}>🔔 Notifiche Push</div>
            <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 3 }}>
              {pushEnabled ? 'Attive · ricevi news e offerte' : 'Disattive · tocca per abilitare'}
            </div>
          </div>
          <button
            onClick={togglePush}
            disabled={pushLoading}
            style={{
              width: 50, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
              background: pushEnabled ? 'var(--green)' : 'var(--bg3)',
              position: 'relative', transition: '.25s', flexShrink: 0,
              boxShadow: pushEnabled ? '0 0 12px rgba(61,255,110,.4)' : 'none',
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3, transition: '.25s',
              left: pushEnabled ? 25 : 3,
              boxShadow: '0 1px 4px rgba(0,0,0,.3)',
            }} />
          </button>
        </div>
      )}

      {/* Telegram contatto */}
      <a href="https://t.me/magichous8" target="_blank" rel="noopener" style={{
        background: 'var(--card)', border: '1px solid rgba(59,130,246,.25)',
        borderRadius: 'var(--radius)', padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'var(--text)',
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: '50%', background: 'rgba(59,130,246,.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0,
        }}>✈️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '.9rem' }}>Scrivici su Telegram</div>
          <div style={{ fontSize: '.75rem', color: '#3b82f6', marginTop: 3 }}>@magichous8</div>
        </div>
        <span style={{ color: 'var(--muted)', fontSize: '1.2rem' }}>›</span>
      </a>

      {/* Canale ufficiale */}
      <a href="https://t.me/+x-k20v41qKk0NGJk" target="_blank" rel="noopener" style={{
        background: 'var(--card)', border: '1px solid rgba(61,255,110,.15)',
        borderRadius: 'var(--radius)', padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'var(--text)',
      }}>
        <div style={{
          width: 46, height: 46, borderRadius: '50%', background: 'rgba(61,255,110,.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0,
        }}>📢</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '.9rem' }}>Canale Ufficiale</div>
          <div style={{ fontSize: '.75rem', color: 'var(--green)', marginTop: 3 }}>Novità & Offerte esclusive</div>
        </div>
        <span style={{ color: 'var(--muted)', fontSize: '1.2rem' }}>›</span>
      </a>

      {/* Disclaimer */}
      <div style={{
        background: 'rgba(232,59,59,.07)', border: '1px solid rgba(232,59,59,.2)',
        borderRadius: 'var(--radius)', padding: '14px 16px',
        fontSize: '.75rem', color: 'var(--muted)', lineHeight: 1.6,
      }}>
        ⚠️ Account limitato? Salva prima il contatto <span style={{ color: 'var(--red)', fontWeight: 700 }}>@magichous8</span> prima di scrivere.
      </div>
    </div>
  )
}

/* ---- Auth utilities (client-side, SHA-256 via Web Crypto) ---- */

async function hashPwd(pw: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

interface StoredAccount { name: string; handle: string; hash: string }

function getAccounts(): StoredAccount[] {
  try { return JSON.parse(localStorage.getItem('tp_accounts') ?? '[]') } catch { return [] }
}

async function doRegister(name: string, handle: string, password: string) {
  const accounts = getAccounts()
  if (accounts.some(a => a.handle.toLowerCase() === handle.toLowerCase()))
    return { ok: false, error: 'Username già in uso' }
  accounts.push({ name, handle, hash: await hashPwd(password) })
  localStorage.setItem('tp_accounts', JSON.stringify(accounts))
  return { ok: true }
}

async function doLogin(handle: string, password: string) {
  const account = getAccounts().find(a => a.handle.toLowerCase() === handle.toLowerCase())
  if (!account) return { ok: false, error: 'Username non trovato' }
  if (await hashPwd(password) !== account.hash) return { ok: false, error: 'Password errata' }
  return { ok: true, name: account.name }
}

/* ---- Auth components ---- */

const inputStyle = (hasError?: boolean): React.CSSProperties => ({
  background: 'var(--bg3)', borderRadius: 12, outline: 'none',
  border: `1px solid ${hasError ? 'rgba(232,59,59,.5)' : 'rgba(61,255,110,.25)'}`,
  padding: '13px 16px', color: 'var(--text)', fontSize: '.93rem',
  fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
})

function AuthView() {
  const { login } = useUIStore()
  const [mode, setMode] = React.useState<'register' | 'login'>('register')

  // Register fields
  const [regName, setRegName] = React.useState('')
  const [regHandle, setRegHandle] = React.useState('')
  const [regPwd, setRegPwd] = React.useState('')
  const [regPwd2, setRegPwd2] = React.useState('')

  // Login fields
  const [logHandle, setLogHandle] = React.useState('')
  const [logPwd, setLogPwd] = React.useState('')

  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  function reset() { setError(''); setLoading(false) }

  async function handleRegister() {
    if (!regName.trim() || regName.trim().length < 2) return setError('Inserisci il tuo nome (min. 2 caratteri)')
    if (!regHandle.trim() || regHandle.trim().length < 3) return setError('Username troppo corto (min. 3 caratteri)')
    if (!/^[a-zA-Z0-9_]+$/.test(regHandle.trim())) return setError('Username: solo lettere, numeri e _')
    if (regPwd.length < 6) return setError('Password troppo corta (min. 6 caratteri)')
    if (regPwd !== regPwd2) return setError('Le password non coincidono')
    setLoading(true)
    const res = await doRegister(regName.trim(), regHandle.trim(), regPwd)
    setLoading(false)
    if (!res.ok) return setError(res.error!)
    login(regName.trim(), regHandle.trim())
  }

  async function handleLogin() {
    if (!logHandle.trim()) return setError('Inserisci username')
    if (!logPwd) return setError('Inserisci password')
    setLoading(true)
    const res = await doLogin(logHandle.trim(), logPwd)
    setLoading(false)
    if (!res.ok) return setError(res.error!)
    login(res.name!, logHandle.trim())
  }

  function switchMode(m: 'register' | 'login') { setMode(m); reset() }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20 }}>
      {/* Avatar */}
      <div style={{
        width: 74, height: 74, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, rgba(61,255,110,.22), rgba(61,255,110,.05))',
        border: '2px solid rgba(61,255,110,.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2rem', marginBottom: 16, boxShadow: '0 0 20px rgba(61,255,110,.12)',
      }}>👤</div>

      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.45rem', marginBottom: 4 }}>
        {mode === 'register' ? 'Crea Account' : 'Bentornato'}
      </div>
      <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginBottom: 24, textAlign: 'center' }}>
        {mode === 'register'
          ? 'Registrati per accedere al Canale, Ordini e Affiliati'
          : 'Accedi con le tue credenziali'}
      </div>

      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mode === 'register' ? (
          <>
            <input placeholder="Nome" value={regName}
              onChange={e => { setRegName(e.target.value); setError('') }}
              style={inputStyle()} autoComplete="name" />
            <input placeholder="Username (es. mario_97)" value={regHandle}
              onChange={e => { setRegHandle(e.target.value.replace(/\s/g, '')); setError('') }}
              style={inputStyle()} autoComplete="username" />
            <input type="password" placeholder="Password (min. 6 caratteri)" value={regPwd}
              onChange={e => { setRegPwd(e.target.value); setError('') }}
              style={inputStyle()} autoComplete="new-password" />
            <input type="password" placeholder="Conferma password" value={regPwd2}
              onChange={e => { setRegPwd2(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              style={inputStyle(!!error && regPwd2 !== regPwd)} autoComplete="new-password" />
          </>
        ) : (
          <>
            <input placeholder="Username" value={logHandle}
              onChange={e => { setLogHandle(e.target.value.replace(/\s/g, '')); setError('') }}
              style={inputStyle()} autoComplete="username" />
            <input type="password" placeholder="Password" value={logPwd}
              onChange={e => { setLogPwd(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={inputStyle()} autoComplete="current-password" />
          </>
        )}

        {error && (
          <div style={{ fontSize: '.75rem', color: 'var(--red)', marginTop: -2, paddingLeft: 4 }}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={mode === 'register' ? handleRegister : handleLogin}
          disabled={loading}
          style={{
            padding: '14px', borderRadius: 12, fontFamily: 'inherit', fontWeight: 700,
            fontSize: '1rem', cursor: loading ? 'default' : 'pointer', transition: '.2s',
            background: loading ? 'rgba(61,255,110,.08)' : 'rgba(61,255,110,.18)',
            border: '1.5px solid rgba(61,255,110,.5)',
            color: 'var(--green)', boxShadow: '0 0 16px rgba(61,255,110,.1)', marginTop: 4,
          }}
        >
          {loading ? '...' : mode === 'register' ? '🚀 Crea Account' : '🔑 Accedi'}
        </button>

        <button
          onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}
          style={{
            background: 'none', border: 'none', color: 'var(--muted)',
            fontSize: '.78rem', cursor: 'pointer', fontFamily: 'inherit', padding: '6px 4px',
          }}
        >
          {mode === 'register' ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
        </button>
      </div>
    </div>
  )
}

function AuthGate() {
  const { setView } = useUIStore()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, gap: 0 }}>
      <div style={{ fontSize: '3.5rem', marginBottom: 16, opacity: .7 }}>🔒</div>
      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem', marginBottom: 8 }}>
        Accesso richiesto
      </div>
      <div style={{ fontSize: '.82rem', color: 'var(--muted)', textAlign: 'center', marginBottom: 28, maxWidth: 240 }}>
        Registrati o accedi con il tuo account per vedere questa sezione
      </div>
      <button
        onClick={() => setView('account')}
        style={{
          padding: '13px 36px', borderRadius: 12, fontFamily: 'inherit', fontWeight: 700,
          fontSize: '.95rem', cursor: 'pointer',
          background: 'rgba(61,255,110,.18)', border: '1.5px solid rgba(61,255,110,.5)',
          color: 'var(--green)', boxShadow: '0 0 16px rgba(61,255,110,.12)',
        }}
      >
        👤 Vai all&apos;Account
      </button>
    </div>
  )
}

function AffiliatesView() {
  return (
    <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 32, fontSize: '.88rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: 8 }}>👥</div>
      Programma affiliati disponibile prossimamente
    </div>
  )
}

