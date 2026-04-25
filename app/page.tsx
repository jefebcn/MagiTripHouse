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
  const { view } = useUIStore()
  useTelegram() // init TG WebApp

  return (
    <main style={{ minHeight: '100dvh', maxWidth: 480, margin: '0 auto', position: 'relative' }}>
      <LedLine />

      {/* Catalog view */}
      <div style={{ display: view === 'catalog' ? 'block' : 'none' }}>
        <Header />
        <AnnouncementBanner />
        <Marquee />
        <CategoryFilter />
        <SearchBar />
        <ProductGrid />
      </div>

      {/* News view */}
      <div style={{ display: view === 'news' ? 'block' : 'none', padding: '16px 16px 100px' }}>
        <NewsView />
      </div>

      {/* Orders view */}
      <div style={{ display: view === 'orders' ? 'block' : 'none', padding: '16px 16px 100px' }}>
        <OrdersView />
      </div>

      {/* Account view */}
      <div style={{ display: view === 'account' ? 'block' : 'none', padding: '16px 16px 100px' }}>
        <AccountView />
      </div>

      {/* Affiliates view */}
      <div style={{ display: view === 'affiliates' ? 'block' : 'none', padding: '16px 16px 100px' }}>
        <AffiliatesView />
      </div>

      {/* Panels + overlays */}
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

  /* ---- INTERNO del canale ---- */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header interno */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid rgba(61,255,110,.15)',
        borderRadius: 'var(--radius)', padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20,
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
  const { user } = useTelegram()
  const [name, setName] = React.useState('')
  const [editing, setEditing] = React.useState(false)
  const [inputVal, setInputVal] = React.useState('')
  const [pushEnabled, setPushEnabled] = React.useState(false)
  const [pushLoading, setPushLoading] = React.useState(false)
  const [hasSW, setHasSW] = React.useState(false)

  React.useEffect(() => {
    const saved = localStorage.getItem('tp_user') ?? ''
    const displayName = saved || user || ''
    setName(displayName)
    setInputVal(displayName)
    const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
    setHasSW(supported)
    if (supported) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => setPushEnabled(!!sub))
      )
    }
  }, [user])

  function saveName() {
    const t = inputVal.trim()
    if (t) { localStorage.setItem('tp_user', t); setName(t) }
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

  const initial = name ? name[0].toUpperCase() : '?'
  const hasName = !!name

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
          background: hasName ? 'var(--green)' : 'var(--bg3)',
          border: hasName ? 'none' : '2px dashed var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.4rem', fontWeight: 800, color: '#000',
          fontFamily: "'Fredoka One', cursive",
          boxShadow: hasName ? 'var(--led-green)' : 'none',
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
              {name || 'Ospite'}
            </div>
            <button
              onClick={() => { setEditing(true); setInputVal(name) }}
              style={{
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 20, padding: '7px 18px', color: 'var(--muted)',
                fontFamily: 'inherit', fontSize: '.8rem', cursor: 'pointer',
              }}
            >
              {hasName ? '✏️ Modifica nome' : '👤 Imposta il tuo nome'}
            </button>
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

function AffiliatesView() {
  return (
    <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 32, fontSize: '.88rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: 8 }}>👥</div>
      Programma affiliati disponibile prossimamente
    </div>
  )
}

