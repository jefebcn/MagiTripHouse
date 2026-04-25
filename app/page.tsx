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
  return (
    <div>
      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.4rem', marginBottom: 16, letterSpacing: '.3px' }}>
        📢 Novità
      </div>
      <NewsGrid />
    </div>
  )
}

function NewsGrid() {
  const [news, setNews] = React.useState<NewsItem[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch('/api/news')
      .then((r) => r.json())
      .then((data) => { setNews(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>Caricamento...</div>
  if (!news.length) return (
    <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>
      <div style={{ fontSize: '3rem', marginBottom: 8 }}>📭</div>
      <div>Nessuna novità per ora</div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {news.map((item, i) => (
        <div
          key={item.id}
          style={{
            gridColumn: i === 0 ? '1 / -1' : undefined,
            background: 'var(--card)', border: '1px solid rgba(61,255,110,.15)',
            borderRadius: 'var(--radius)', padding: 16,
            animation: 'fadeInUp .35s ease both', animationDelay: `${i * 0.06}s`,
          }}
        >
          <div style={{ fontSize: i === 0 ? '2rem' : '1.5rem', marginBottom: 8 }}>{item.emoji}</div>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: i === 0 ? '1.1rem' : '.9rem', marginBottom: 6 }}>
            {item.title}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '.78rem', lineHeight: 1.55 }}>{item.content}</div>
          <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginTop: 8, opacity: .7 }}>
            {new Date(item.createdAt).toLocaleDateString('it-IT')}
          </div>
          {item.productLink && (
            <a
              href={item.productLink}
              target="_blank"
              rel="noopener"
              style={{ display: 'inline-block', marginTop: 10, color: 'var(--green)', fontSize: '.75rem', fontWeight: 700 }}
            >
              Scopri →
            </a>
          )}
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

