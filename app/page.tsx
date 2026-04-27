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
  const { view, isLoggedIn, setView, sessionToken } = useUIStore()
  useTelegram()

  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  // Heartbeat every 60s while logged in — tracks time in app
  React.useEffect(() => {
    if (!sessionToken) return
    const ping = () => fetch('/api/activity', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sessionToken}` },
    }).catch(() => {})
    ping() // immediate on login
    const id = setInterval(ping, 60_000)
    return () => clearInterval(id)
  }, [sessionToken])

  const gated = (content: React.ReactNode) =>
    isLoggedIn ? content : <AuthGate />

  return (
    <main style={{ minHeight: '100dvh', maxWidth: 480, margin: '0 auto', position: 'relative' }}>
      <LedLine />

      <div style={{ display: view === 'catalog' ? 'block' : 'none' }}>
        {isLoggedIn ? (
          <>
            <Header />
            <AnnouncementBanner />
            <Marquee />
            <CategoryFilter />
            <SearchBar />
            <ProductGrid />
          </>
        ) : (
          <div style={{ padding: '16px 16px 100px' }}>
            <AuthView />
          </div>
        )}
      </div>

      <div style={{ display: view === 'news' ? 'block' : 'none' }}>
        {gated(<NewsView />)}
      </div>

      <div style={{ display: view === 'orders' ? 'block' : 'none', padding: '16px 16px 100px' }}>
        {gated(<OrdersView />)}
      </div>

      <div style={{ display: view === 'account' ? 'block' : 'none', padding: '16px 16px 100px' }}>
        {isLoggedIn ? <AccountView /> : <AuthView />}
      </div>

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

const inputStyle = (hasError?: boolean): React.CSSProperties => ({
  background: 'var(--bg3)', borderRadius: 12, outline: 'none',
  border: `1px solid ${hasError ? 'rgba(232,59,59,.5)' : 'rgba(61,255,110,.25)'}`,
  padding: '13px 16px', color: 'var(--text)', fontSize: '.93rem',
  fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
})

// ---- Inline simple views ----

function NewsView() {
  const { sessionToken, channelJoined, setChannelJoined, setView } = useUIStore()

  const [subscribed, setSubscribed] = React.useState(false)
  const [memberCount, setMemberCount] = React.useState<number | null>(null)
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = React.useState(false)
  const [pwaBannerDismissed, setPwaBannerDismissed] = React.useState(false)

  React.useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)
    setPwaBannerDismissed(sessionStorage.getItem('pwa_banner_dismissed') === '1')

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription().then(sub => { if (sub) setSubscribed(true) })
      ).catch(() => {})
    }

    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // On mount (or token change): sync membership status from server so cross-device login works
  React.useEffect(() => {
    if (!sessionToken) {
      // Not logged in — just fetch the public count
      fetch('/api/push/count').then(r => r.json()).then(d => setMemberCount(d.count)).catch(() => {})
      return
    }
    fetch('/api/channel/join', { headers: { 'Authorization': `Bearer ${sessionToken}` } })
      .then(r => r.json())
      .then(d => {
        if (d.joined && !channelJoined) setChannelJoined(true)
        if (typeof d.count === 'number') setMemberCount(d.count)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken])

  // Enter channel: persist joined state, call API only first time
  function joinChannel() {
    if (!channelJoined) {
      setChannelJoined(true)
      if (sessionToken) {
        fetch('/api/channel/join', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sessionToken}` },
        })
          .then(r => r.json())
          .then(d => { if (typeof d.count === 'number') setMemberCount(d.count) })
          .catch(() => {})
      }
    }
    // Try push async regardless (idempotent — browser returns existing sub if already subscribed)
    if ('serviceWorker' in navigator && 'PushManager' in window && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      navigator.serviceWorker.ready.then(async reg => {
        try {
          const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          const pad = '='.repeat((4 - key.length % 4) % 4)
          const b64 = (key + pad).replace(/-/g, '+').replace(/_/g, '/')
          const raw = atob(b64); const arr = new Uint8Array(raw.length)
          for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
          const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: arr })
          await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })
          setSubscribed(true)
        } catch { /* permission denied or unsupported */ }
      }).catch(() => {})
    }
  }

  /* ─── LANDING ─── */
  if (!channelJoined) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 100px' }}>
      {/* Channel avatar */}
      <div style={{
        width: 96, height: 96, borderRadius: '50%', marginBottom: 20,
        background: 'radial-gradient(circle at 35% 35%, rgba(61,255,110,.4), rgba(61,255,110,.1))',
        border: '2.5px solid rgba(61,255,110,.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2.8rem', boxShadow: '0 0 40px rgba(61,255,110,.25)',
      }}>📡</div>

      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.6rem', textAlign: 'center', marginBottom: 6 }}>
        Magic Trip House
      </div>
      <div style={{ fontSize: '.82rem', color: 'var(--muted)', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
        Canale ufficiale<br />Novità, offerte &amp; aggiornamenti esclusivi
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32,
        background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 20, padding: '10px 24px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--green)' }}>{memberCount ?? '—'}</div>
          <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>iscritti</div>
        </div>
        <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)' }}>📡</div>
          <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>canale</div>
        </div>
      </div>

      <button
        onClick={joinChannel}
        style={{
          width: '100%', maxWidth: 300, padding: '15px',
          borderRadius: 14, fontFamily: 'inherit', fontWeight: 700,
          fontSize: '1.05rem', cursor: 'pointer',
          background: 'linear-gradient(135deg, rgba(61,255,110,.25), rgba(61,255,110,.12))',
          border: '1.5px solid rgba(61,255,110,.6)',
          color: 'var(--green)', boxShadow: '0 0 24px rgba(61,255,110,.2)',
          marginBottom: 10,
        }}
      >📡 Entra nel Canale</button>
      <div style={{ fontSize: '.7rem', color: 'var(--muted)', opacity: .7 }}>
        Attiva le notifiche per non perderti nulla
      </div>
    </div>
  )

  const showPwaBanner = !isStandalone && !pwaBannerDismissed

  /* ─── INTERNO canale (stile Telegram) ─── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', paddingBottom: 80 }}>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(8,12,8,.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(61,255,110,.12)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => setView('catalog')} style={{
          background: 'none', border: 'none', color: 'var(--muted)',
          fontSize: '1.3rem', cursor: 'pointer', padding: '0 4px', lineHeight: 1,
        }}>‹</button>
        <div style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(61,255,110,.15)', border: '1.5px solid rgba(61,255,110,.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
        }}>📡</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', lineHeight: 1.2 }}>Magic Trip House</div>
          <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>
            {memberCount ?? '—'} iscritti · {subscribed ? '🔔 notifiche attive' : '🔕 solo lettura'}
          </div>
        </div>
      </div>

      {/* PWA banner */}
      {showPwaBanner && (
        <div style={{
          margin: '10px 12px 0',
          background: 'linear-gradient(135deg,rgba(61,255,110,.1),rgba(245,200,66,.06))',
          border: '1px solid rgba(61,255,110,.25)', borderRadius: 12, padding: '12px 14px',
          display: 'flex', gap: 10, alignItems: 'flex-start', position: 'relative',
        }}>
          <button onClick={() => { sessionStorage.setItem('pwa_banner_dismissed','1'); setPwaBannerDismissed(true) }}
            style={{ position:'absolute', top:8, right:10, background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:'.9rem' }}>✕</button>
          <span style={{ fontSize:'1.5rem', flexShrink:0 }}>📲</span>
          <div style={{ paddingRight: 20 }}>
            <div style={{ fontWeight:700, fontSize:'.82rem', color:'var(--green)', marginBottom:3 }}>Installa l&apos;app!</div>
            <div style={{ fontSize:'.73rem', color:'var(--muted)', lineHeight:1.5 }}>
              {deferredPrompt
                ? <button onClick={async () => { deferredPrompt.prompt(); await deferredPrompt.userChoice; setDeferredPrompt(null) }}
                    style={{ background:'rgba(61,255,110,.15)', border:'1px solid rgba(61,255,110,.4)', borderRadius:8, padding:'5px 14px', color:'var(--green)', fontFamily:'inherit', fontWeight:700, fontSize:'.78rem', cursor:'pointer' }}>
                    📲 Installa ora
                  </button>
                : <>iOS: Condividi → Aggiungi a Home · Android: menu → Aggiungi a schermata Home</>
              }
            </div>
          </div>
        </div>
      )}

      {/* Feed messaggi */}
      <ChannelFeed />
    </div>
  )
}

function ChannelFeed() {
  const { view } = useUIStore()
  const [news, setNews] = React.useState<NewsItem[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (view !== 'news') return
    setLoading(true)
    fetch('/api/news')
      .then(r => r.json())
      .then(data => { setNews(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [view])

  if (loading) return (
    <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: 'var(--card)', borderRadius: 16, height: 110, opacity: .4, animation: 'skeleton-shine 1.4s infinite' }} />
      ))}
    </div>
  )

  if (!news.length) return (
    <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '60px 24px' }}>
      <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
      <div style={{ fontSize: '.9rem', fontWeight: 600 }}>Nessun messaggio ancora</div>
      <div style={{ fontSize: '.75rem', marginTop: 6, opacity: .6 }}>I messaggi del canale appariranno qui</div>
    </div>
  )

  return (
    <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {news.map((item, i) => {
        const dt = new Date(item.createdAt)
        const today = new Date(); const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
        const isToday = dt.toDateString() === today.toDateString()
        const isYest = dt.toDateString() === yesterday.toDateString()
        const dateLabel = isToday ? 'Oggi' : isYest ? 'Ieri' : dt.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
        const prevItem = news[i - 1]
        const prevDt = prevItem ? new Date(prevItem.createdAt) : null
        const showDate = !prevDt || prevDt.toDateString() !== dt.toDateString()

        return (
          <React.Fragment key={item.id}>
            {showDate && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 6px' }}>
                <span style={{
                  background: 'rgba(61,255,110,.08)', border: '1px solid rgba(61,255,110,.15)',
                  borderRadius: 20, padding: '3px 14px', fontSize: '.68rem', color: 'var(--muted)',
                }}>{dateLabel}</span>
              </div>
            )}
            {/* Channel post bubble */}
            <div style={{
              background: 'var(--bg2)',
              border: '1px solid rgba(61,255,110,.1)',
              borderRadius: '4px 16px 16px 16px',
              padding: '0',
              animation: 'fadeInUp .25s ease both',
              animationDelay: `${Math.min(i, 6) * 0.04}s`,
              overflow: 'hidden',
              position: 'relative',
            }}>
              {/* Channel name bar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px 6px',
                borderBottom: '1px solid rgba(61,255,110,.07)',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(61,255,110,.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.85rem',
                }}>📡</div>
                <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.85rem', color: 'var(--green)', flex: 1 }}>
                  Magic Trip House
                </span>
              </div>

              {/* Post content */}
              <div style={{ padding: '10px 14px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>{item.emoji}</span>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', letterSpacing: '.2px', flex: 1, paddingTop: 2 }}>
                    {item.title}
                  </div>
                </div>
                <div style={{ fontSize: '.85rem', color: '#cce8d0', lineHeight: 1.65, marginBottom: (item.imageUrl || item.productLink) ? 10 : 6 }}>
                  {item.content}
                </div>
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" style={{
                    width: '100%', borderRadius: 10, marginBottom: 10,
                    maxHeight: 320, objectFit: 'cover', display: 'block',
                  }} />
                )}
                {item.productLink && (
                  <a href={item.productLink} target="_blank" rel="noopener" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'rgba(61,255,110,.1)', border: '1px solid rgba(61,255,110,.3)',
                    borderRadius: 20, padding: '6px 14px',
                    color: 'var(--green)', fontSize: '.78rem', fontWeight: 700, textDecoration: 'none',
                  }}>🛒 Scopri il prodotto →</a>
                )}
                {/* Timestamp */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <span style={{ fontSize: '.65rem', color: 'var(--muted)', opacity: .7 }}>
                    {dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} ✓
                  </span>
                </div>
              </div>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

interface NewsItem {
  id: string; title: string; content: string; emoji: string; imageUrl?: string; productLink?: string; createdAt: string
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

interface MeData {
  joinedAt: string
  avatarUrl: string | null
  affiliate: { code: string; referredBy: string | null; referralCount: number } | null
  channelMember: boolean
}

function PushToggle({ enabled, loading, onToggle }: { enabled: boolean; loading: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      style={{
        width: 50, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
        background: enabled ? 'var(--green)' : 'rgba(106,138,106,.2)',
        position: 'relative', transition: '.25s', flexShrink: 0,
        boxShadow: enabled ? '0 0 12px rgba(61,255,110,.35)' : 'none',
      }}
    >
      <div style={{
        width: 22, height: 22, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3, transition: '.25s',
        left: enabled ? 25 : 3,
        boxShadow: '0 1px 4px rgba(0,0,0,.4)',
      }} />
    </button>
  )
}

function AccountView() {
  const { userName, userHandle, userRole, userAvatar, sessionToken, login, logout, setView, setUserAvatar } = useUIStore()

  // Inline edit name
  const [editingName, setEditingName] = React.useState(false)
  const [nameVal, setNameVal] = React.useState('')

  // Avatar upload
  const avatarInputRef = React.useRef<HTMLInputElement>(null)
  const [avatarLoading, setAvatarLoading] = React.useState(false)

  // Push
  const [pushEnabled, setPushEnabled] = React.useState(false)
  const [pushLoading, setPushLoading] = React.useState(false)
  const [hasSW, setHasSW] = React.useState(false)

  // Password change
  const [showPwd, setShowPwd] = React.useState(false)
  const [pwdCurrent, setPwdCurrent] = React.useState('')
  const [pwdNew, setPwdNew] = React.useState('')
  const [pwdConfirm, setPwdConfirm] = React.useState('')
  const [pwdLoading, setPwdLoading] = React.useState(false)
  const [pwdMsg, setPwdMsg] = React.useState<{ ok: boolean; text: string } | null>(null)

  // Server data
  const [meData, setMeData] = React.useState<MeData | null>(null)
  const [codeCopied, setCodeCopied] = React.useState(false)

  // Orders count from localStorage
  const [orderCount, setOrderCount] = React.useState(0)

  React.useEffect(() => {
    setNameVal(userName)
    const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
    setHasSW(supported)
    if (supported) {
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => setPushEnabled(!!sub))
      )
    }
    const saved = localStorage.getItem('tp_orders')
    if (saved) { try { setOrderCount(JSON.parse(saved).length) } catch { /* */ } }

    if (sessionToken) {
      fetch('/api/me', { headers: { Authorization: `Bearer ${sessionToken}` } })
        .then(r => r.json())
        .then((d: MeData) => {
          setMeData(d)
          if (d.avatarUrl && d.avatarUrl !== userAvatar) setUserAvatar(d.avatarUrl)
        })
        .catch(() => {})
    }
  }, [userName, sessionToken]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    setAvatarLoading(true)
    try {
      const { upload } = await import('@vercel/blob/client')
      const filename = `avatars/${userHandle}-${Date.now()}.${file.name.split('.').pop()}`
      const blob = await upload(filename, file, { access: 'public', handleUploadUrl: '/api/upload' })
      await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ avatarUrl: blob.url }),
      })
      setUserAvatar(blob.url)
    } catch { /* upload failed silently */ }
    finally { setAvatarLoading(false); if (avatarInputRef.current) avatarInputRef.current.value = '' }
  }

  function saveName() {
    const t = nameVal.trim()
    if (t) login(t, userHandle, userRole, sessionToken)
    setEditingName(false)
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

  async function changePassword() {
    if (pwdNew !== pwdConfirm) { setPwdMsg({ ok: false, text: 'Le password non coincidono' }); return }
    if (pwdNew.length < 6) { setPwdMsg({ ok: false, text: 'Minimo 6 caratteri' }); return }
    setPwdLoading(true); setPwdMsg(null)
    try {
      const res = await fetch('/api/users/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ currentPassword: pwdCurrent, newPassword: pwdNew }),
      })
      const d = await res.json()
      if (!res.ok) { setPwdMsg({ ok: false, text: d.error ?? 'Errore' }); return }
      setPwdMsg({ ok: true, text: 'Password aggiornata!' })
      setPwdCurrent(''); setPwdNew(''); setPwdConfirm('')
      setTimeout(() => setShowPwd(false), 1500)
    } catch { setPwdMsg({ ok: false, text: 'Errore di rete' }) }
    finally { setPwdLoading(false) }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    }).catch(() => {})
  }

  const initial = userName ? userName[0].toUpperCase() : '?'
  const joinedDate = meData?.joinedAt ? new Date(meData.joinedAt).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) : null

  const rowStyle: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '15px 18px',
    display: 'flex', alignItems: 'center', gap: 14,
  }
  const iconCircle = (bg: string, emoji: string) => (
    <div style={{
      width: 44, height: 44, borderRadius: '50%', background: bg, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
    }}>{emoji}</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Hero card ── */}
      <div style={{
        background: 'linear-gradient(160deg,#0d1f0f 0%,var(--card) 60%)',
        border: '1px solid rgba(61,255,110,.18)',
        borderRadius: 'var(--radius)', padding: '28px 20px 22px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(61,255,110,.08) 0%,transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Avatar — tap to change */}
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => !avatarLoading && avatarInputRef.current?.click()}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%', overflow: 'hidden',
            background: 'linear-gradient(135deg,var(--green),var(--green2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.6rem', fontWeight: 800, color: '#000',
            fontFamily: "'Fredoka One', cursive",
            boxShadow: '0 0 0 4px rgba(61,255,110,.15), var(--led-green)',
            flexShrink: 0,
          }}>
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : initial}
          </div>
          {/* Camera overlay */}
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 26, height: 26, borderRadius: '50%',
            background: avatarLoading ? 'rgba(61,255,110,.3)' : 'var(--bg2)',
            border: '2px solid var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.75rem', transition: '.2s',
          }}>
            {avatarLoading ? '⏳' : '📷'}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
        </div>

        {/* Name / edit */}
        {editingName ? (
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <input
              autoFocus value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              placeholder="Il tuo nome..."
              style={{
                flex: 1, background: 'var(--bg3)', borderRadius: 10, outline: 'none',
                border: '1px solid rgba(61,255,110,.4)', padding: '10px 14px',
                color: 'var(--text)', fontSize: '.92rem', fontFamily: 'inherit',
              }}
            />
            <button onClick={saveName} style={{
              background: 'rgba(61,255,110,.15)', border: '1px solid rgba(61,255,110,.4)',
              borderRadius: 10, padding: '0 16px', color: 'var(--green)',
              fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer', fontSize: '1.2rem',
            }}>✓</button>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.4rem', letterSpacing: '.3px' }}>
                {userName}
              </div>
              {userHandle && (
                <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 2 }}>@{userHandle}</div>
              )}
              {joinedDate && (
                <div style={{ fontSize: '.68rem', color: 'rgba(106,138,106,.6)', marginTop: 4 }}>
                  🗓 Membro da {joinedDate}
                </div>
              )}
            </div>
          </>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 4 }}>
          {[
            { label: 'Ordini', value: orderCount, icon: '📋', onClick: () => setView('orders') },
            { label: 'Referral', value: meData?.affiliate?.referralCount ?? 0, icon: '👥', onClick: undefined },
            { label: 'Canale', value: meData?.channelMember ? '✓' : '—', icon: '📡', onClick: () => setView('news') },
          ].map(s => (
            <button key={s.label} onClick={s.onClick ?? undefined}
              style={{
                flex: 1, background: 'rgba(61,255,110,.05)', border: '1px solid rgba(61,255,110,.1)',
                borderRadius: 12, padding: '10px 0', cursor: s.onClick ? 'pointer' : 'default',
                textAlign: 'center', transition: '.15s',
              }}
            >
              <div style={{ fontSize: '1rem', marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', color: 'var(--text)' }}>{s.value}</div>
              <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: 1, letterSpacing: '.3px' }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* Action buttons */}
        {!editingName && (
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button
              onClick={() => { setEditingName(true); setNameVal(userName) }}
              style={{
                flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 20, padding: '8px 0', color: 'var(--muted)',
                fontFamily: 'inherit', fontSize: '.8rem', cursor: 'pointer',
              }}
            >✏️ Modifica nome</button>
            <button
              onClick={logout}
              style={{
                background: 'rgba(232,59,59,.08)', border: '1px solid rgba(232,59,59,.22)',
                borderRadius: 20, padding: '8px 18px', color: 'var(--red)',
                fontFamily: 'inherit', fontSize: '.8rem', cursor: 'pointer',
              }}
            >Esci</button>
          </div>
        )}
      </div>

      {/* ── Referral code ── */}
      {meData?.affiliate && (
        <div style={{
          background: 'var(--card)', border: '1px solid rgba(245,200,66,.2)',
          borderRadius: 'var(--radius)', padding: '16px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: '.88rem' }}>🎫 Il tuo codice referral</div>
            {meData.affiliate.referralCount > 0 && (
              <div style={{ fontSize: '.7rem', color: 'var(--gold)', fontWeight: 600 }}>
                {meData.affiliate.referralCount} {meData.affiliate.referralCount === 1 ? 'amico' : 'amici'} iscritti
              </div>
            )}
          </div>
          <button
            onClick={() => copyCode(meData.affiliate!.code)}
            style={{
              width: '100%', background: 'linear-gradient(135deg,rgba(245,200,66,.08),rgba(245,200,66,.04))',
              border: '1.5px solid rgba(245,200,66,.35)', borderRadius: 12,
              padding: '14px 18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span style={{
              fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem',
              letterSpacing: '8px', color: 'var(--gold)',
              textShadow: 'var(--led-gold)',
            }}>
              {meData.affiliate.code}
            </span>
            <span style={{
              fontSize: '.72rem', fontWeight: 700,
              color: codeCopied ? 'var(--green)' : 'var(--muted)',
              transition: '.2s',
            }}>
              {codeCopied ? '✓ Copiato!' : '📋 Copia'}
            </span>
          </button>
          <div style={{ fontSize: '.7rem', color: 'rgba(106,138,106,.6)', marginTop: 8, lineHeight: 1.5 }}>
            Condividi questo codice — ogni amico che si registra con il tuo codice ti viene attribuito.
          </div>
        </div>
      )}

      {/* ── Push notifications ── */}
      {hasSW && (
        <div style={{ ...rowStyle, justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '.88rem' }}>🔔 Notifiche Push</div>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 3 }}>
              {pushEnabled ? 'Attive · ricevi news e offerte' : 'Disattive · tocca per abilitare'}
            </div>
          </div>
          <PushToggle enabled={pushEnabled} loading={pushLoading} onToggle={togglePush} />
        </div>
      )}

      {/* ── Links group ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <a href="https://t.me/magichous8" target="_blank" rel="noopener" style={{
          background: 'var(--card)', border: '1px solid rgba(59,130,246,.2)',
          borderBottom: 'none', borderRadius: '16px 16px 0 0',
          padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 14,
          textDecoration: 'none', color: 'var(--text)',
        }}>
          {iconCircle('rgba(59,130,246,.15)', '✈️')}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '.88rem' }}>Scrivici su Telegram</div>
            <div style={{ fontSize: '.72rem', color: '#3b82f6', marginTop: 2 }}>@magichous8</div>
          </div>
          <span style={{ color: 'var(--muted)' }}>›</span>
        </a>
        <button onClick={() => setView('news')} style={{
          width: '100%', background: 'var(--card)', border: '1px solid rgba(61,255,110,.15)',
          borderRadius: '0 0 16px 16px',
          padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 14,
          cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit',
        }}>
          {iconCircle('rgba(61,255,110,.1)', '📢')}
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: '.88rem' }}>Canale Ufficiale</div>
            <div style={{ fontSize: '.72rem', color: 'var(--green)', marginTop: 2 }}>Novità & Offerte esclusive</div>
          </div>
          <span style={{ color: 'var(--muted)' }}>›</span>
        </button>
      </div>

      {/* ── Social ── */}
      <a href="https://www.instagram.com/magictriphouse_4.0" target="_blank" rel="noopener" style={{
        background: 'var(--card)',
        border: '1px solid rgba(193,53,132,.25)',
        borderRadius: 'var(--radius)', padding: '15px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        textDecoration: 'none', color: 'var(--text)',
      }}>
        {iconCircle('rgba(193,53,132,.15)', '📸')}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '.88rem' }}>Seguici su Instagram</div>
          <div style={{ fontSize: '.72rem', color: '#e1306c', marginTop: 2 }}>@magictriphouse_4.0</div>
        </div>
        <span style={{ color: 'var(--muted)' }}>›</span>
      </a>

      {/* ── Change password ── */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', overflow: 'hidden',
      }}>
        <button
          onClick={() => { setShowPwd(v => !v); setPwdMsg(null) }}
          style={{
            width: '100%', padding: '15px 18px', background: 'none', border: 'none',
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', color: 'var(--text)',
            fontFamily: 'inherit',
          }}
        >
          {iconCircle('rgba(106,138,106,.12)', '🔑')}
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: '.88rem' }}>Cambia Password</div>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 2 }}>Aggiorna le tue credenziali di accesso</div>
          </div>
          <span style={{ color: 'var(--muted)', transition: '.2s', transform: showPwd ? 'rotate(90deg)' : 'none' }}>›</span>
        </button>

        {showPwd && (
          <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(['Password attuale', 'Nuova password', 'Conferma nuova'] as const).map((label, i) => {
              const vals = [pwdCurrent, pwdNew, pwdConfirm]
              const setters = [setPwdCurrent, setPwdNew, setPwdConfirm]
              return (
                <input
                  key={i}
                  type="password"
                  placeholder={label}
                  value={vals[i]}
                  onChange={(e) => setters[i](e.target.value)}
                  style={{
                    background: 'var(--bg3)', borderRadius: 10, outline: 'none',
                    border: '1px solid rgba(61,255,110,.2)', padding: '11px 14px',
                    color: 'var(--text)', fontSize: '.88rem', fontFamily: 'inherit', width: '100%',
                  }}
                />
              )
            })}
            {pwdMsg && (
              <div style={{ fontSize: '.75rem', color: pwdMsg.ok ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                {pwdMsg.ok ? '✓' : '⚠️'} {pwdMsg.text}
              </div>
            )}
            <button
              onClick={changePassword}
              disabled={pwdLoading || !pwdCurrent || !pwdNew || !pwdConfirm}
              style={{
                background: 'linear-gradient(135deg,rgba(61,255,110,.2),rgba(61,255,110,.1))',
                border: '1px solid rgba(61,255,110,.4)', borderRadius: 10, padding: '11px',
                color: 'var(--green)', fontFamily: 'inherit', fontWeight: 700,
                fontSize: '.88rem', cursor: 'pointer',
              }}
            >
              {pwdLoading ? 'Salvataggio...' : 'Aggiorna password'}
            </button>
          </div>
        )}
      </div>

      {/* ── Disclaimer ── */}
      <div style={{
        background: 'rgba(255,107,53,.05)', border: '1px solid rgba(255,107,53,.18)',
        borderRadius: 12, padding: '12px 16px',
        fontSize: '.72rem', color: 'rgba(106,138,106,.7)', lineHeight: 1.6,
      }}>
        ⚠️ Account Telegram limitato? Salva prima il contatto{' '}
        <span style={{ color: '#ffcf99', fontWeight: 700 }}>@magichous8</span>{' '}
        prima di scrivere.
      </div>

    </div>
  )
}

/* ---- Auth components ---- */

function AuthView() {
  const { login } = useUIStore()
  const [mode, setMode] = React.useState<'register' | 'login'>('register')

  const [regName, setRegName] = React.useState('')
  const [regHandle, setRegHandle] = React.useState('')
  const [regPwd, setRegPwd] = React.useState('')
  const [regPwd2, setRegPwd2] = React.useState('')
  const [adminCode, setAdminCode] = React.useState('')
  const [showAdmin, setShowAdmin] = React.useState(false)

  const [logHandle, setLogHandle] = React.useState('')
  const [logPwd, setLogPwd] = React.useState('')

  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  function reset() { setError('') }

  async function handleRegister() {
    if (!regName.trim() || regName.trim().length < 2) return setError('Inserisci il tuo nome (min. 2 caratteri)')
    if (!regHandle.trim() || regHandle.trim().length < 3) return setError('Username troppo corto (min. 3 caratteri)')
    if (!/^[a-zA-Z0-9_]+$/.test(regHandle.trim())) return setError('Username: solo lettere, numeri e _')
    if (regPwd.length < 6) return setError('Password troppo corta (min. 6 caratteri)')
    if (regPwd !== regPwd2) return setError('Le password non coincidono')
    setLoading(true)
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName.trim(), handle: regHandle.trim(), password: regPwd, adminCode }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Errore di registrazione'); setLoading(false); return }
      login(data.name, data.handle, data.role, data.token)
    } catch { setError('Errore di rete. Riprova.') }
    setLoading(false)
  }

  async function handleLogin() {
    if (!logHandle.trim()) return setError('Inserisci username')
    if (!logPwd) return setError('Inserisci password')
    setLoading(true)
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: logHandle.trim(), password: logPwd }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Credenziali non valide'); setLoading(false); return }
      login(data.name, data.handle, data.role, data.token)
    } catch { setError('Errore di rete. Riprova.') }
    setLoading(false)
  }

  function switchMode(m: 'register' | 'login') { setMode(m); reset() }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20 }}>
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
      <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginBottom: 16, textAlign: 'center' }}>
        {mode === 'register'
          ? 'Registrati per accedere al Canale, Ordini e Affiliati'
          : 'Accedi con le tue credenziali'}
      </div>
      {mode === 'login' && (
        <div style={{
          background: 'rgba(61,255,110,.06)', border: '1px solid rgba(61,255,110,.15)',
          borderRadius: 10, padding: '9px 14px', marginBottom: 16, width: '100%', maxWidth: 340, boxSizing: 'border-box',
        }}>
          <div style={{ fontSize: '.72rem', color: 'var(--muted)', lineHeight: 1.5 }}>
            💡 <strong style={{ color: 'var(--text)' }}>Suggerimento:</strong> salva le credenziali nel tuo browser/portachiavi iPhone — si compilerà automaticamente la prossima volta.<br />
            Se hai dimenticato la password, contatta l&apos;admin su <strong style={{ color: '#3b82f6' }}>@magichous8</strong> per il reset.
          </div>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mode === 'register' ? (
          <>
            <input placeholder="Nome" value={regName}
              onChange={e => { setRegName(e.target.value); reset() }}
              style={inputStyle()} autoComplete="name" />
            <input placeholder="Username (es. mario_97)" value={regHandle}
              onChange={e => { setRegHandle(e.target.value.replace(/\s/g, '')); reset() }}
              style={inputStyle()} autoComplete="username" />
            <input type="password" placeholder="Password (min. 6 caratteri)" value={regPwd}
              onChange={e => { setRegPwd(e.target.value); reset() }}
              style={inputStyle()} autoComplete="new-password" />
            <input type="password" placeholder="Conferma password" value={regPwd2}
              onChange={e => { setRegPwd2(e.target.value); reset() }}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              style={inputStyle(!!error && regPwd2 !== regPwd)} autoComplete="new-password" />
            {showAdmin && (
              <input placeholder="Codice admin (opzionale)" value={adminCode}
                onChange={e => setAdminCode(e.target.value)}
                style={inputStyle()} autoComplete="off" />
            )}
            <button onClick={() => setShowAdmin(v => !v)}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '.7rem', cursor: 'pointer', textAlign: 'left', padding: '0 2px' }}>
              {showAdmin ? '▲ Nascondi codice admin' : '▼ Ho un codice admin'}
            </button>
          </>
        ) : (
          <>
            <input placeholder="Username" value={logHandle}
              onChange={e => { setLogHandle(e.target.value.replace(/\s/g, '')); reset() }}
              style={inputStyle()} autoComplete="username" />
            <input type="password" placeholder="Password" value={logPwd}
              onChange={e => { setLogPwd(e.target.value); reset() }}
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

