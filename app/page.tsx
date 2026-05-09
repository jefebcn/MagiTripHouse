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
  const { view, isLoggedIn, setView, sessionToken, setLastReadNewsAt, setLatestNewsAt } = useUIStore()
  useTelegram()

  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  React.useEffect(() => {
    fetch('/api/news')
      .then(r => r.json())
      .then((data: { createdAt: string }[]) => {
        if (data.length > 0) setLatestNewsAt(data[0].createdAt)
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    if (view === 'news') {
      setLastReadNewsAt(new Date().toISOString())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  React.useEffect(() => {
    if (!sessionToken) return
    const ping = () => fetch('/api/activity', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sessionToken}` },
    }).catch(() => {})
    ping()
    const id = setInterval(ping, 60_000)
    return () => clearInterval(id)
  }, [sessionToken])

  const gated = (content: React.ReactNode) =>
    isLoggedIn ? content : <AuthGate />

  return (
    <main style={{ minHeight: '100dvh', maxWidth: 480, margin: '0 auto', position: 'relative' }}>
      <LedLine />

      {view === 'game' && <GameView />}

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

  React.useEffect(() => {
    if (!sessionToken) {
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

  if (!channelJoined) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 100px' }}>
      <div style={{
        width: 96, height: 96, borderRadius: '50%', marginBottom: 20,
        background: 'radial-gradient(circle at 35% 35%, rgba(61,255,110,.4), rgba(61,255,110,.1))',
        border: '2.5px solid rgba(61,255,110,.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2.8rem', boxShadow: '0 0 40px rgba(61,255,110,.25)',
      }}>📡</div>
      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.6rem', textAlign: 'center', marginBottom: 6 }}>Magic Trip House</div>
      <div style={{ fontSize: '.82rem', color: 'var(--muted)', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>Canale ufficiale<br />Novità, offerte &amp; aggiornamenti esclusivi</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 20, padding: '10px 24px' }}>
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
      <button onClick={joinChannel} style={{ width: '100%', maxWidth: 300, padding: '15px', borderRadius: 14, fontFamily: 'inherit', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', background: 'linear-gradient(135deg, rgba(61,255,110,.25), rgba(61,255,110,.12))', border: '1.5px solid rgba(61,255,110,.6)', color: 'var(--green)', boxShadow: '0 0 24px rgba(61,255,110,.2)', marginBottom: 10 }}>📡 Entra nel Canale</button>
      <div style={{ fontSize: '.7rem', color: 'var(--muted)', opacity: .7 }}>Attiva le notifiche per non perderti nulla</div>
    </div>
  )

  const showPwaBanner = !isStandalone && !pwaBannerDismissed

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', paddingBottom: 80 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(8,12,8,.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(61,255,110,.12)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setView('catalog')} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.3rem', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>‹</button>
        <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: 'rgba(61,255,110,.15)', border: '1.5px solid rgba(61,255,110,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>📡</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', lineHeight: 1.2 }}>Magic Trip House</div>
          <div style={{ fontSize: '.68rem', color: 'var(--muted)' }}>{memberCount ?? '—'} iscritti · {subscribed ? '🔔 notifiche attive' : '🔕 solo lettura'}</div>
        </div>
      </div>
      {showPwaBanner && (
        <div style={{ margin: '10px 12px 0', background: 'linear-gradient(135deg,rgba(61,255,110,.1),rgba(245,200,66,.06))', border: '1px solid rgba(61,255,110,.25)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', position: 'relative' }}>
          <button onClick={() => { sessionStorage.setItem('pwa_banner_dismissed','1'); setPwaBannerDismissed(true) }} style={{ position:'absolute', top:8, right:10, background:'none', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:'.9rem' }}>✕</button>
          <span style={{ fontSize:'1.5rem', flexShrink:0 }}>📲</span>
          <div style={{ paddingRight: 20 }}>
            <div style={{ fontWeight:700, fontSize:'.82rem', color:'var(--green)', marginBottom:3 }}>Installa l&apos;app!</div>
            <div style={{ fontSize:'.73rem', color:'var(--muted)', lineHeight:1.5 }}>
              {deferredPrompt
                ? <button onClick={async () => { deferredPrompt.prompt(); await deferredPrompt.userChoice; setDeferredPrompt(null) }} style={{ background:'rgba(61,255,110,.15)', border:'1px solid rgba(61,255,110,.4)', borderRadius:8, padding:'5px 14px', color:'var(--green)', fontFamily:'inherit', fontWeight:700, fontSize:'.78rem', cursor:'pointer' }}>📲 Installa ora</button>
                : <>iOS: Condividi → Aggiungi a Home · Android: menu → Aggiungi a schermata Home</>
              }
            </div>
          </div>
        </div>
      )}
      <ChannelFeed />
    </div>
  )
}

function ChannelFeed() {
  const { view, setLatestNewsAt } = useUIStore()
  const [news, setNews] = React.useState<NewsItem[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (view !== 'news') return
    setLoading(true)
    fetch('/api/news')
      .then(r => r.json())
      .then((data: NewsItem[]) => { setNews(data); setLoading(false); if (data.length > 0) setLatestNewsAt(data[0].createdAt) })
      .catch(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  if (loading) return (
    <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1,2,3].map(i => <div key={i} style={{ background: 'var(--card)', borderRadius: 16, height: 110, opacity: .4, animation: 'skeleton-shine 1.4s infinite' }} />)}
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
                <span style={{ background: 'rgba(61,255,110,.08)', border: '1px solid rgba(61,255,110,.15)', borderRadius: 20, padding: '3px 14px', fontSize: '.68rem', color: 'var(--muted)' }}>{dateLabel}</span>
              </div>
            )}
            <div style={{ background: 'var(--bg2)', border: '1px solid rgba(61,255,110,.1)', borderRadius: '4px 16px 16px 16px', overflow: 'hidden', position: 'relative', animation: 'fadeInUp .25s ease both', animationDelay: `${Math.min(i,6)*0.04}s` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 6px', borderBottom: '1px solid rgba(61,255,110,.07)' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: 'rgba(61,255,110,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.85rem' }}>📡</div>
                <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.85rem', color: 'var(--green)', flex: 1 }}>Magic Trip House</span>
              </div>
              <div style={{ padding: '10px 14px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.5rem', lineHeight: 1, flexShrink: 0 }}>{item.emoji}</span>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', letterSpacing: '.2px', flex: 1, paddingTop: 2 }}>{item.title}</div>
                </div>
                <div style={{ fontSize: '.85rem', color: '#cce8d0', lineHeight: 1.65, marginBottom: (item.imageUrl || item.productLink) ? 10 : 6 }}>{item.content}</div>
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 10, maxHeight: 320, objectFit: 'cover', display: 'block' }} />
                )}
                {item.productLink && (
                  <a href={item.productLink} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(61,255,110,.1)', border: '1px solid rgba(61,255,110,.3)', borderRadius: 20, padding: '6px 14px', color: 'var(--green)', fontSize: '.78rem', fontWeight: 700, textDecoration: 'none' }}>🛒 Scopri il prodotto →</a>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <span style={{ fontSize: '.65rem', color: 'var(--muted)', opacity: .7 }}>{dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} ✓</span>
                </div>
              </div>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

interface NewsItem { id: string; title: string; content: string; emoji: string; imageUrl?: string; productLink?: string; createdAt: string }
interface GameItemDef {
  emoji: string; label: string; pts: number; speed: number; weight: number; glow: string
  isSlow?: boolean; isLife?: boolean; isDanger?: boolean; isSuperDanger?: boolean; isRare?: boolean
}
const GAME_ITEMS: GameItemDef[] = [
  { emoji: '🌿', label: 'Erba',       pts: 2,   speed: 2.5, weight: 38, glow: 'rgba(61,255,110,.7)'   },
  { emoji: '🍃', label: 'Foglia',     pts: 3,   speed: 2.1, weight: 20, glow: 'rgba(80,220,100,.8)'   },
  { emoji: '🍯', label: 'Hash',       pts: 5,   speed: 1.8, weight: 12, glow: 'rgba(245,200,66,.7)'   },
  { emoji: '💎', label: 'Crystal',    pts: 8,   speed: 1.4, weight: 6,  glow: 'rgba(100,180,255,.9)',  isRare: true },
  { emoji: '⭐', label: 'Stella Oro', pts: 15,  speed: 0.9, weight: 3,  glow: 'rgba(255,215,0,.95)',   isRare: true },
  { emoji: '💨', label: 'Fumata',     pts: 0,   speed: 2.0, weight: 8,  glow: 'rgba(180,150,255,.7)',  isSlow: true },
  { emoji: '❤️', label: 'Vita',       pts: 0,   speed: 1.7, weight: 4,  glow: 'rgba(255,80,80,.8)',    isLife: true },
  { emoji: '💣', label: 'Bomba',      pts: -5,  speed: 3.0, weight: 6,  glow: 'rgba(232,59,59,.9)',    isDanger: true },
  { emoji: '🚔', label: 'Polizia',    pts: -10, speed: 2.3, weight: 3,  glow: 'rgba(255,100,0,.9)',    isSuperDanger: true },
]
function pickItemDef(): GameItemDef {
  let r = Math.random() * 100
  for (const def of GAME_ITEMS) { r -= def.weight; if (r <= 0) return def }
  return GAME_ITEMS[0]
}
function comboMultiplier(combo: number) {
  if (combo >= 8) return 3
  if (combo >= 5) return 2
  if (combo >= 3) return 1.5
  return 1
}
const BG_STARS = Array.from({ length: 18 }, (_, i) => ({
  id: i, left: (i * 37 + 11) % 100, top: (i * 53 + 7) % 100,
  size: 1.5 + (i % 3) * 0.8, dur: 2.5 + (i % 4) * 0.7, delay: (i * 0.3) % 3,
}))
interface FItem { id: number; def: GameItemDef; x: number; y: number; wobble: number }
interface FbItem { id: number; x: number; y: number; text: string; color: string }
interface LeaderEntry { id: string; handle: string; name: string; score: number; month: string }
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
    <button onClick={onToggle} disabled={loading} style={{ width: 50, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer', background: enabled ? 'var(--green)' : 'rgba(106,138,106,.2)', position: 'relative', transition: '.25s', flexShrink: 0, boxShadow: enabled ? '0 0 12px rgba(61,255,110,.35)' : 'none' }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: '.25s', left: enabled ? 25 : 3, boxShadow: '0 1px 4px rgba(0,0,0,.4)' }} />
    </button>
  )
}

function AccountView() {
  const { userName, userHandle, userRole, userAvatar, sessionToken, login, logout, setView, setUserAvatar } = useUIStore()
  const [editingName, setEditingName] = React.useState(false)
  const [nameVal, setNameVal] = React.useState('')
  const avatarInputRef = React.useRef<HTMLInputElement>(null)
  const [avatarLoading, setAvatarLoading] = React.useState(false)
  const [pushEnabled, setPushEnabled] = React.useState(false)
  const [pushLoading, setPushLoading] = React.useState(false)
  const [hasSW, setHasSW] = React.useState(false)
  const [pushMsg, setPushMsg] = React.useState<{ ok: boolean; text: string } | null>(null)
  const [permissionDenied, setPermissionDenied] = React.useState(false)
  const [isIos, setIsIos] = React.useState(false)
  const [orders, setOrders] = React.useState<OrderItem[]>([])
  const [showOrders, setShowOrders] = React.useState(false)
  const [showPwd, setShowPwd] = React.useState(false)
  const [pwdCurrent, setPwdCurrent] = React.useState('')
  const [pwdNew, setPwdNew] = React.useState('')
  const [pwdConfirm, setPwdConfirm] = React.useState('')
  const [pwdLoading, setPwdLoading] = React.useState(false)
  const [pwdMsg, setPwdMsg] = React.useState<{ ok: boolean; text: string } | null>(null)
  const [meData, setMeData] = React.useState<MeData | null>(null)
  const [codeCopied, setCodeCopied] = React.useState(false)
  const [orderCount, setOrderCount] = React.useState(0)

  React.useEffect(() => {
    setNameVal(userName)
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent))
    const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
    setHasSW(supported)
    if (supported) navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription().then(sub => setPushEnabled(!!sub)))
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') setPermissionDenied(true)
    const saved = localStorage.getItem('tp_orders')
    if (saved) { try { const parsed = JSON.parse(saved); setOrders(parsed); setOrderCount(parsed.length) } catch { /* */ } }
    if (sessionToken) {
      fetch('/api/me', { headers: { Authorization: `Bearer ${sessionToken}` } })
        .then(r => r.json())
        .then((d: MeData) => { setMeData(d); if (d.avatarUrl && d.avatarUrl !== userAvatar) setUserAvatar(d.avatarUrl) })
        .catch(() => {})
    }
  }, [userName, sessionToken]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setAvatarLoading(true)
    try {
      const { upload } = await import('@vercel/blob/client')
      const filename = `avatars/${userHandle}-${Date.now()}.${file.name.split('.').pop()}`
      const blob = await upload(filename, file, { access: 'public', handleUploadUrl: '/api/upload' })
      await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` }, body: JSON.stringify({ avatarUrl: blob.url }) })
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
    if (!hasSW) { setPushMsg({ ok: false, text: 'Notifiche non supportate su questo browser' }); return }
    setPushLoading(true); setPushMsg(null)
    try {
      if (pushEnabled) {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) { await sub.unsubscribe(); await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }) }
        setPushEnabled(false); setPushMsg({ ok: true, text: 'Notifiche disattivate' })
      } else {
        if (Notification.permission === 'denied') { setPermissionDenied(true); setPushLoading(false); return }
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) { setPushMsg({ ok: false, text: 'Chiavi VAPID non configurate' }); setPushLoading(false); return }
        const permission = await Notification.requestPermission()
        if (permission === 'denied') { setPermissionDenied(true); setPushLoading(false); return }
        if (permission !== 'granted') { setPushMsg({ ok: false, text: 'Permesso non concesso' }); setPushLoading(false); return }
        setPermissionDenied(false)
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) })
        await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })
        setPushEnabled(true); setPushMsg({ ok: true, text: '🔔 Notifiche attivate!' })
        setTimeout(() => setPushMsg(null), 3000)
      }
    } catch (err) { setPushMsg({ ok: false, text: err instanceof Error ? err.message : 'Errore' }) }
    setPushLoading(false)
  }

  async function changePassword() {
    if (pwdNew !== pwdConfirm) { setPwdMsg({ ok: false, text: 'Le password non coincidono' }); return }
    if (pwdNew.length < 6) { setPwdMsg({ ok: false, text: 'Minimo 6 caratteri' }); return }
    setPwdLoading(true); setPwdMsg(null)
    try {
      const res = await fetch('/api/users/password', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` }, body: JSON.stringify({ currentPassword: pwdCurrent, newPassword: pwdNew }) })
      const d = await res.json()
      if (!res.ok) { setPwdMsg({ ok: false, text: d.error ?? 'Errore' }); return }
      setPwdMsg({ ok: true, text: 'Password aggiornata!' })
      setPwdCurrent(''); setPwdNew(''); setPwdConfirm('')
      setTimeout(() => setShowPwd(false), 1500)
    } catch { setPwdMsg({ ok: false, text: 'Errore di rete' }) }
    finally { setPwdLoading(false) }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => { setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000) }).catch(() => {})
  }

  const initial = userName ? userName[0].toUpperCase() : '?'
  const joinedDate = meData?.joinedAt ? new Date(meData.joinedAt).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) : null
  const rowStyle: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 14 }
  const iconCircle = (bg: string, emoji: string) => (<div style={{ width: 44, height: 44, borderRadius: '50%', background: bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>{emoji}</div>)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: 'linear-gradient(160deg,#0d1f0f 0%,var(--card) 60%)', border: '1px solid rgba(61,255,110,.18)', borderRadius: 'var(--radius)', padding: '28px 20px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(61,255,110,.08) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => !avatarLoading && avatarInputRef.current?.click()}>
          <div style={{ width: 88, height: 88, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,var(--green),var(--green2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.6rem', fontWeight: 800, color: '#000', fontFamily: "'Fredoka One', cursive", boxShadow: '0 0 0 4px rgba(61,255,110,.15), var(--led-green)', flexShrink: 0 }}>
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userAvatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : initial}
          </div>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: avatarLoading ? 'rgba(61,255,110,.3)' : 'var(--bg2)', border: '2px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', transition: '.2s' }}>{avatarLoading ? '⏳' : '📷'}</div>
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>
        {editingName ? (
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <input autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveName()} placeholder="Il tuo nome..." style={{ flex: 1, background: 'var(--bg3)', borderRadius: 10, outline: 'none', border: '1px solid rgba(61,255,110,.4)', padding: '10px 14px', color: 'var(--text)', fontSize: '.92rem', fontFamily: 'inherit' }} />
            <button onClick={saveName} style={{ background: 'rgba(61,255,110,.15)', border: '1px solid rgba(61,255,110,.4)', borderRadius: 10, padding: '0 16px', color: 'var(--green)', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer', fontSize: '1.2rem' }}>✓</button>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.4rem', letterSpacing: '.3px' }}>{userName}</div>
            {userHandle && <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 2 }}>@{userHandle}</div>}
            {joinedDate && <div style={{ fontSize: '.68rem', color: 'rgba(106,138,106,.6)', marginTop: 4 }}>🗓 Membro da {joinedDate}</div>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 4 }}>
          {[
            { label: 'Ordini', value: orderCount, icon: '📋', onClick: () => setShowOrders(v => !v) },
            { label: 'Referral', value: meData?.affiliate?.referralCount ?? 0, icon: '👥', onClick: undefined },
            { label: 'Canale', value: meData?.channelMember ? '✓' : '—', icon: '📡', onClick: () => setView('news') },
          ].map(s => (
            <button key={s.label} onClick={s.onClick ?? undefined} style={{ flex: 1, background: 'rgba(61,255,110,.05)', border: '1px solid rgba(61,255,110,.1)', borderRadius: 12, padding: '10px 0', cursor: s.onClick ? 'pointer' : 'default', textAlign: 'center', transition: '.15s' }}>
              <div style={{ fontSize: '1rem', marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', color: 'var(--text)' }}>{s.value}</div>
              <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: 1, letterSpacing: '.3px' }}>{s.label}</div>
            </button>
          ))}
        </div>
        {!editingName && (
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button onClick={() => { setEditingName(true); setNameVal(userName) }} style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 20, padding: '8px 0', color: 'var(--muted)', fontFamily: 'inherit', fontSize: '.8rem', cursor: 'pointer' }}>✏️ Modifica nome</button>
            <button onClick={logout} style={{ background: 'rgba(232,59,59,.08)', border: '1px solid rgba(232,59,59,.22)', borderRadius: 20, padding: '8px 18px', color: 'var(--red)', fontFamily: 'inherit', fontSize: '.8rem', cursor: 'pointer' }}>Esci</button>
          </div>
        )}
      </div>

      {orders.length > 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <button onClick={() => setShowOrders(v => !v)} style={{ width: '100%', padding: '15px 18px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit' }}>
            {iconCircle('rgba(61,255,110,.1)', '📋')}
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '.88rem' }}>I Miei Ordini</div>
              <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 2 }}>{orderCount} ordine{orderCount !== 1 ? 'i' : ''}</div>
            </div>
            <span style={{ color: 'var(--muted)', transition: '.2s', transform: showOrders ? 'rotate(90deg)' : 'none' }}>›</span>
          </button>
          {showOrders && (
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {orders.map(o => (
                <div key={o.id} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.88rem' }}>{o.id}</div>
                    <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 2 }}>{o.date}</div>
                  </div>
                  <div style={{ fontFamily: "'Fredoka One', cursive", color: 'var(--green)', fontSize: '.92rem' }}>€{o.total}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {meData?.affiliate && (
        <div style={{ background: 'var(--card)', border: '1px solid rgba(245,200,66,.2)', borderRadius: 'var(--radius)', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: '.88rem' }}>🎫 Il tuo codice referral</div>
            {meData.affiliate.referralCount > 0 && <div style={{ fontSize: '.7rem', color: 'var(--gold)', fontWeight: 600 }}>{meData.affiliate.referralCount} {meData.affiliate.referralCount === 1 ? 'amico' : 'amici'} iscritti</div>}
          </div>
          <button onClick={() => copyCode(meData.affiliate!.code)} style={{ width: '100%', background: 'linear-gradient(135deg,rgba(245,200,66,.08),rgba(245,200,66,.04))', border: '1.5px solid rgba(245,200,66,.35)', borderRadius: 12, padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem', letterSpacing: '8px', color: 'var(--gold)', textShadow: 'var(--led-gold)' }}>{meData.affiliate.code}</span>
            <span style={{ fontSize: '.72rem', fontWeight: 700, color: codeCopied ? 'var(--green)' : 'var(--muted)', transition: '.2s' }}>{codeCopied ? '✓ Copiato!' : '📋 Copia'}</span>
          </button>
          <div style={{ fontSize: '.7rem', color: 'rgba(106,138,106,.6)', marginTop: 8, lineHeight: 1.5 }}>Condividi questo codice — ogni amico che si registra con il tuo codice ti viene attribuito.</div>
        </div>
      )}

      <div style={{ ...rowStyle, flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '.88rem' }}>🔔 Notifiche Push</div>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 3 }}>
              {!hasSW ? 'Non supportate su questo browser' : pushEnabled ? 'Attive · ricevi news e offerte' : permissionDenied ? '🔕 Permesso bloccato' : 'Disattive · tocca per abilitare'}
            </div>
          </div>
          <PushToggle enabled={pushEnabled} loading={pushLoading} onToggle={togglePush} />
        </div>
        {permissionDenied && (
          <div style={{ background: 'rgba(232,59,59,.06)', border: '1px solid rgba(232,59,59,.2)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#e83b3b', marginBottom: 8 }}>🔕 Il browser ha bloccato le notifiche</div>
            <div style={{ fontSize: '.7rem', color: 'var(--muted)', lineHeight: 1.7, marginBottom: 10 }}>
              {isIos ? (<><strong style={{ color: 'var(--text)' }}>Come sbloccare su iPhone/iPad:</strong><br />1. Apri <strong style={{ color: 'var(--text)' }}>Impostazioni</strong><br />2. Scorri fino a <strong style={{ color: 'var(--text)' }}>Safari</strong><br />3. Tocca <strong style={{ color: 'var(--text)' }}>Notifiche</strong><br />4. Imposta su <strong style={{ color: 'var(--text)' }}>Consenti</strong><br />5. Torna qui e tocca il pulsante qui sotto</>) : (<><strong style={{ color: 'var(--text)' }}>Come sbloccare:</strong><br />1. Tocca l&apos;icona 🔒 nella barra del browser<br />2. Tocca <strong style={{ color: 'var(--text)' }}>Notifiche → Consenti</strong><br />3. Ricarica la pagina e tocca il pulsante qui sotto</>)}
            </div>
            <button onClick={togglePush} disabled={pushLoading} style={{ width: '100%', background: 'rgba(61,255,110,.12)', border: '1px solid rgba(61,255,110,.4)', borderRadius: 8, padding: '9px', color: 'var(--green)', fontFamily: 'inherit', fontWeight: 700, fontSize: '.8rem', cursor: 'pointer' }}>
              {pushLoading ? '...' : '✓ Ho abilitato — Attiva notifiche'}
            </button>
          </div>
        )}
        {pushMsg && !permissionDenied && (
          <div style={{ fontSize: '.72rem', fontWeight: 600, color: pushMsg.ok ? 'var(--green)' : '#e83b3b', background: pushMsg.ok ? 'rgba(61,255,110,.08)' : 'rgba(232,59,59,.08)', border: `1px solid ${pushMsg.ok ? 'rgba(61,255,110,.2)' : 'rgba(232,59,59,.2)'}`, borderRadius: 8, padding: '6px 10px' }}>{pushMsg.text}</div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <a href="https://t.me/magichous8" target="_blank" rel="noopener" style={{ background: 'var(--card)', border: '1px solid rgba(59,130,246,.2)', borderBottom: 'none', borderRadius: '16px 16px 0 0', padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'var(--text)' }}>
          {iconCircle('rgba(59,130,246,.15)', '✈️')}
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: '.88rem' }}>Scrivici su Telegram</div><div style={{ fontSize: '.72rem', color: '#3b82f6', marginTop: 2 }}>@magichous8</div></div>
          <span style={{ color: 'var(--muted)' }}>›</span>
        </a>
        <button onClick={() => setView('news')} style={{ width: '100%', background: 'var(--card)', border: '1px solid rgba(61,255,110,.15)', borderRadius: '0 0 16px 16px', padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit' }}>
          {iconCircle('rgba(61,255,110,.1)', '📢')}
          <div style={{ flex: 1, textAlign: 'left' }}><div style={{ fontWeight: 700, fontSize: '.88rem' }}>Canale Ufficiale</div><div style={{ fontSize: '.72rem', color: 'var(--green)', marginTop: 2 }}>Novità & Offerte esclusive</div></div>
          <span style={{ color: 'var(--muted)' }}>›</span>
        </button>
      </div>

      <a href="https://www.instagram.com/magictriphouse_4.0" target="_blank" rel="noopener" style={{ background: 'var(--card)', border: '1px solid rgba(193,53,132,.25)', borderRadius: 'var(--radius)', padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'var(--text)' }}>
        {iconCircle('rgba(193,53,132,.15)', '📸')}
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: '.88rem' }}>Seguici su Instagram</div><div style={{ fontSize: '.72rem', color: '#e1306c', marginTop: 2 }}>@magictriphouse_4.0</div></div>
        <span style={{ color: 'var(--muted)' }}>›</span>
      </a>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <button onClick={() => { setShowPwd(v => !v); setPwdMsg(null) }} style={{ width: '100%', padding: '15px 18px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit' }}>
          {iconCircle('rgba(106,138,106,.12)', '🔑')}
          <div style={{ flex: 1, textAlign: 'left' }}><div style={{ fontWeight: 700, fontSize: '.88rem' }}>Cambia Password</div><div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 2 }}>Aggiorna le tue credenziali di accesso</div></div>
          <span style={{ color: 'var(--muted)', transition: '.2s', transform: showPwd ? 'rotate(90deg)' : 'none' }}>›</span>
        </button>
        {showPwd && (
          <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(['Password attuale', 'Nuova password', 'Conferma nuova'] as const).map((label, i) => {
              const vals = [pwdCurrent, pwdNew, pwdConfirm]
              const setters = [setPwdCurrent, setPwdNew, setPwdConfirm]
              return <input key={i} type="password" placeholder={label} value={vals[i]} onChange={e => setters[i](e.target.value)} style={{ background: 'var(--bg3)', borderRadius: 10, outline: 'none', border: '1px solid rgba(61,255,110,.2)', padding: '11px 14px', color: 'var(--text)', fontSize: '.88rem', fontFamily: 'inherit', width: '100%' }} />
            })}
            {pwdMsg && <div style={{ fontSize: '.75rem', color: pwdMsg.ok ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{pwdMsg.ok ? '✓' : '⚠️'} {pwdMsg.text}</div>}
            <button onClick={changePassword} disabled={pwdLoading || !pwdCurrent || !pwdNew || !pwdConfirm} style={{ background: 'linear-gradient(135deg,rgba(61,255,110,.2),rgba(61,255,110,.1))', border: '1px solid rgba(61,255,110,.4)', borderRadius: 10, padding: '11px', color: 'var(--green)', fontFamily: 'inherit', fontWeight: 700, fontSize: '.88rem', cursor: 'pointer' }}>
              {pwdLoading ? 'Salvataggio...' : 'Aggiorna password'}
            </button>
          </div>
        )}
      </div>

      <div style={{ background: 'rgba(255,107,53,.05)', border: '1px solid rgba(255,107,53,.18)', borderRadius: 12, padding: '12px 16px', fontSize: '.72rem', color: 'rgba(106,138,106,.7)', lineHeight: 1.6 }}>
        ⚠️ Account Telegram limitato? Salva prima il contatto{' '}
        <span style={{ color: '#ffcf99', fontWeight: 700 }}>@magichous8</span>{' '}prima di scrivere.
      </div>
    </div>
  )
}

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
      const res = await fetch('/api/users/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: regName.trim(), handle: regHandle.trim(), password: regPwd, adminCode }) })
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
      const res = await fetch('/api/users/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle: logHandle.trim(), password: logPwd }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Credenziali non valide'); setLoading(false); return }
      login(data.name, data.handle, data.role, data.token)
    } catch { setError('Errore di rete. Riprova.') }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20 }}>
      <div style={{ width: 74, height: 74, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, rgba(61,255,110,.22), rgba(61,255,110,.05))', border: '2px solid rgba(61,255,110,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: 16, boxShadow: '0 0 20px rgba(61,255,110,.12)' }}>👤</div>
      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.45rem', marginBottom: 4 }}>{mode === 'register' ? 'Crea Account' : 'Bentornato'}</div>
      <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginBottom: 16, textAlign: 'center' }}>{mode === 'register' ? 'Registrati per accedere al Canale, Ordini e Affiliati' : 'Accedi con le tue credenziali'}</div>
      {mode === 'login' && (
        <div style={{ background: 'rgba(61,255,110,.06)', border: '1px solid rgba(61,255,110,.15)', borderRadius: 10, padding: '9px 14px', marginBottom: 16, width: '100%', maxWidth: 340, boxSizing: 'border-box' }}>
          <div style={{ fontSize: '.72rem', color: 'var(--muted)', lineHeight: 1.5 }}>💡 <strong style={{ color: 'var(--text)' }}>Suggerimento:</strong> salva le credenziali nel tuo browser/portachiavi iPhone.<br />Se hai dimenticato la password, contatta l&apos;admin su <strong style={{ color: '#3b82f6' }}>@magichous8</strong>.</div>
        </div>
      )}
      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mode === 'register' ? (
          <>
            <input placeholder="Nome" value={regName} onChange={e => { setRegName(e.target.value); reset() }} style={inputStyle()} autoComplete="name" />
            <input placeholder="Username (es. mario_97)" value={regHandle} onChange={e => { setRegHandle(e.target.value.replace(/\s/g, '')); reset() }} style={inputStyle()} autoComplete="username" />
            <input type="password" placeholder="Password (min. 6 caratteri)" value={regPwd} onChange={e => { setRegPwd(e.target.value); reset() }} style={inputStyle()} autoComplete="new-password" />
            <input type="password" placeholder="Conferma password" value={regPwd2} onChange={e => { setRegPwd2(e.target.value); reset() }} onKeyDown={e => e.key === 'Enter' && handleRegister()} style={inputStyle(!!error && regPwd2 !== regPwd)} autoComplete="new-password" />
            {showAdmin && <input placeholder="Codice admin (opzionale)" value={adminCode} onChange={e => setAdminCode(e.target.value)} style={inputStyle()} autoComplete="off" />}
            <button onClick={() => setShowAdmin(v => !v)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '.7rem', cursor: 'pointer', textAlign: 'left', padding: '0 2px' }}>{showAdmin ? '▲ Nascondi codice admin' : '▼ Ho un codice admin'}</button>
          </>
        ) : (
          <>
            <input placeholder="Username" value={logHandle} onChange={e => { setLogHandle(e.target.value.replace(/\s/g, '')); reset() }} style={inputStyle()} autoComplete="username" />
            <input type="password" placeholder="Password" value={logPwd} onChange={e => { setLogPwd(e.target.value); reset() }} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={inputStyle()} autoComplete="current-password" />
          </>
        )}
        {error && <div style={{ fontSize: '.75rem', color: 'var(--red)', marginTop: -2, paddingLeft: 4 }}>⚠️ {error}</div>}
        <button onClick={mode === 'register' ? handleRegister : handleLogin} disabled={loading} style={{ padding: '14px', borderRadius: 12, fontFamily: 'inherit', fontWeight: 700, fontSize: '1rem', cursor: loading ? 'default' : 'pointer', transition: '.2s', background: loading ? 'rgba(61,255,110,.08)' : 'rgba(61,255,110,.18)', border: '1.5px solid rgba(61,255,110,.5)', color: 'var(--green)', boxShadow: '0 0 16px rgba(61,255,110,.1)', marginTop: 4 }}>
          {loading ? '...' : mode === 'register' ? '🚀 Crea Account' : '🔑 Accedi'}
        </button>
        <button onClick={() => { setMode(m => m === 'register' ? 'login' : 'register'); reset() }} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '.78rem', cursor: 'pointer', fontFamily: 'inherit', padding: '6px 4px' }}>
          {mode === 'register' ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
        </button>
      </div>
    </div>
  )
}

function AuthGate() {
  const { setView } = useUIStore()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60 }}>
      <div style={{ fontSize: '3.5rem', marginBottom: 16, opacity: .7 }}>🔒</div>
      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem', marginBottom: 8 }}>Accesso richiesto</div>
      <div style={{ fontSize: '.82rem', color: 'var(--muted)', textAlign: 'center', marginBottom: 28, maxWidth: 240 }}>Registrati o accedi con il tuo account per vedere questa sezione</div>
      <button onClick={() => setView('account')} style={{ padding: '13px 36px', borderRadius: 12, fontFamily: 'inherit', fontWeight: 700, fontSize: '.95rem', cursor: 'pointer', background: 'rgba(61,255,110,.18)', border: '1.5px solid rgba(61,255,110,.5)', color: 'var(--green)', boxShadow: '0 0 16px rgba(61,255,110,.12)' }}>👤 Vai all&apos;Account</button>
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

function GameLeaderboard({ entries }: { entries: LeaderEntry[] }) {
  const month = new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const MEDALS = ['🥇', '🥈', '🥉']
  return (
    <div style={{ background: 'var(--card)', border: '1px solid rgba(245,200,66,.15)', borderRadius: 'var(--radius)', padding: '14px' }}>
      <div style={{ fontWeight: 700, fontSize: '.85rem', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>🏆 Classifica Mensile</span>
        <span style={{ fontSize: '.68rem', color: 'var(--muted)', fontWeight: 400 }}>{month}</span>
      </div>
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.78rem', padding: '18px 0' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🌿</div>
          Nessuna partita ancora · sii il primo!
        </div>
      ) : entries.map((e, i) => (
        <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < entries.length - 1 ? '1px solid rgba(61,255,110,.06)' : 'none' }}>
          <div style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? '1.15rem' : '.75rem', color: i >= 3 ? 'var(--muted)' : undefined, fontWeight: 700 }}>{i < 3 ? MEDALS[i] : i + 1}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '.82rem', color: i === 0 ? 'var(--gold)' : 'var(--text)', fontWeight: i === 0 ? 700 : 400 }}>@{e.handle}</div>
            {e.name && <div style={{ fontSize: '.63rem', color: 'var(--muted)' }}>{e.name}</div>}
          </div>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.05rem', color: i === 0 ? 'var(--gold)' : i < 3 ? 'var(--green)' : 'var(--muted)' }}>{e.score}</div>
        </div>
      ))}
      <div style={{ fontSize: '.62rem', color: 'rgba(106,138,106,.45)', marginTop: 10, textAlign: 'center', lineHeight: 1.55 }}>Il vincitore di fine mese riceve un premio speciale 🎁<br />Classifica resettata ogni 1° del mese</div>
    </div>
  )
}

function GameView() {
  const { sessionToken, isLoggedIn } = useUIStore()
  const [phase, setPhase] = React.useState<'idle' | 'counting' | 'playing' | 'ended'>('idle')
  const [countdown, setCountdown] = React.useState(3)
  const [displayScore, setDisplayScore] = React.useState(0)
  const [displayTime, setDisplayTime] = React.useState(60)
  const [displayLives, setDisplayLives] = React.useState(3)
  const [displayCombo, setDisplayCombo] = React.useState(0)
  const [displayItems, setDisplayItems] = React.useState<FItem[]>([])
  const [displayFb, setDisplayFb] = React.useState<FbItem[]>([])
  const [displaySlowed, setDisplaySlowed] = React.useState(false)
  const [shakeKey, setShakeKey] = React.useState(0)
  const [result, setResult] = React.useState<{ score: number; rank: number | null; bestScore: number } | null>(null)
  const [leaderboard, setLeaderboard] = React.useState<LeaderEntry[]>([])
  const [playsToday, setPlaysToday] = React.useState(0)
  const MAX_PLAYS = 3

  const scoreRef = React.useRef(0)
  const livesRef = React.useRef(3)
  const comboRef = React.useRef(0)
  const itemsRef = React.useRef<FItem[]>([])
  const fbRef = React.useRef<FbItem[]>([])
  const lastSpawnRef = React.useRef(0)
  const startTimeRef = React.useRef(0)
  const slowEndRef = React.useRef(0)
  const rafRef = React.useRef<number>(0)
  const nextIdRef = React.useRef(0)
  const nextFbIdRef = React.useRef(0)
  const gameAreaRef = React.useRef<HTMLDivElement>(null)
  const phaseRef = React.useRef<'idle' | 'counting' | 'playing' | 'ended'>('idle')
  const todayKey = () => `game_plays_${new Date().toISOString().slice(0, 10)}`

  React.useEffect(() => {
    setPlaysToday(parseInt(localStorage.getItem(todayKey()) ?? '0'))
    fetch('/api/game').then(r => r.json()).then((d: LeaderEntry[]) => { if (Array.isArray(d)) setLeaderboard(d) }).catch(() => {})
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function fetchLeaderboard() {
    fetch('/api/game').then(r => r.json()).then((d: LeaderEntry[]) => { if (Array.isArray(d)) setLeaderboard(d) }).catch(() => {})
  }

  function spawnMs(elapsed: number) {
    if (elapsed < 15) return 1200
    if (elapsed < 30) return 950
    if (elapsed < 45) return 740
    return 570
  }

  function startCountdown() {
    setPhase('counting'); phaseRef.current = 'counting'; setCountdown(3)
    let c = 3
    const iv = setInterval(() => { c--; if (c <= 0) { clearInterval(iv); startGame() } else setCountdown(c) }, 1000)
  }

  function startGame() {
    scoreRef.current = 0; livesRef.current = 3; comboRef.current = 0
    itemsRef.current = []; fbRef.current = []; slowEndRef.current = 0
    setDisplayScore(0); setDisplayTime(60); setDisplayLives(3); setDisplayCombo(0)
    setDisplayItems([]); setDisplayFb([]); setDisplaySlowed(false); setResult(null)
    startTimeRef.current = performance.now(); lastSpawnRef.current = 0
    setPhase('playing'); phaseRef.current = 'playing'
    const n = parseInt(localStorage.getItem(todayKey()) ?? '0') + 1
    localStorage.setItem(todayKey(), String(n)); setPlaysToday(n)
    rafRef.current = requestAnimationFrame(loop)
  }

  function loop(now: number) {
    if (phaseRef.current !== 'playing') return
    const elapsed = (now - startTimeRef.current) / 1000
    const remaining = Math.max(0, 60 - elapsed)
    if (remaining <= 0 || livesRef.current <= 0) { endGame(); return }
    const ga = gameAreaRef.current
    if (!ga) { rafRef.current = requestAnimationFrame(loop); return }
    const gH = ga.clientHeight, gW = ga.clientWidth
    const slowed = now < slowEndRef.current
    if (now - lastSpawnRef.current > spawnMs(elapsed)) {
      const def = pickItemDef()
      itemsRef.current.push({ id: nextIdRef.current++, def, x: 8 + Math.random() * Math.max(0, gW - 72), y: -70, wobble: Math.random() * Math.PI * 2 })
      lastSpawnRef.current = now
    }
    const sf = slowed ? 0.35 : 1
    itemsRef.current = itemsRef.current
      .map(i => ({ ...i, y: i.y + i.def.speed * sf, x: i.x + Math.sin(elapsed * 1.8 + i.wobble) * 0.5 }))
      .filter(i => i.y < gH + 70)
    setDisplayScore(scoreRef.current); setDisplayTime(Math.ceil(remaining))
    setDisplayLives(livesRef.current); setDisplayCombo(comboRef.current)
    setDisplayItems([...itemsRef.current]); setDisplayFb([...fbRef.current])
    setDisplaySlowed(slowed)
    rafRef.current = requestAnimationFrame(loop)
  }

  function handleTap(e: React.TouchEvent | React.MouseEvent) {
    if (phaseRef.current !== 'playing') return
    const rect = gameAreaRef.current!.getBoundingClientRect()
    const cx = 'changedTouches' in e ? (e as React.TouchEvent).changedTouches[0].clientX : (e as React.MouseEvent).clientX
    const cy = 'changedTouches' in e ? (e as React.TouchEvent).changedTouches[0].clientY : (e as React.MouseEvent).clientY
    const tx = cx - rect.left, ty = cy - rect.top
    for (let i = itemsRef.current.length - 1; i >= 0; i--) {
      const item = itemsRef.current[i]
      const dx = tx - item.x - 28, dy = ty - item.y - 28
      if (dx * dx + dy * dy < 40 * 40) {
        const def = item.def
        itemsRef.current.splice(i, 1)
        const fbId = nextFbIdRef.current++
        if (def.isSlow) {
          slowEndRef.current = performance.now() + 3000
          comboRef.current++
          fbRef.current = [...fbRef.current, { id: fbId, x: item.x, y: item.y, text: '⏱ SLOW!', color: 'rgba(200,160,255,1)' }]
        } else if (def.isLife) {
          livesRef.current = Math.min(5, livesRef.current + 1)
          comboRef.current++
          fbRef.current = [...fbRef.current, { id: fbId, x: item.x, y: item.y, text: '+1 ❤️', color: 'rgba(255,100,100,1)' }]
        } else if (def.isDanger || def.isSuperDanger) {
          const lost = def.isSuperDanger ? 2 : 1
          livesRef.current = Math.max(0, livesRef.current - lost)
          comboRef.current = 0
          setShakeKey(k => k + 1)
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([60, 20, 60])
          fbRef.current = [...fbRef.current, { id: fbId, x: item.x, y: item.y, text: def.isSuperDanger ? '🚔 -2❤️' : '💥 -1❤️', color: 'rgba(232,59,59,1)' }]
        } else {
          const newCombo = comboRef.current + 1
          const multi = comboMultiplier(newCombo)
          const earned = Math.round(def.pts * multi)
          scoreRef.current += earned
          comboRef.current = newCombo
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10)
          const label = multi > 1 ? `+${earned} ×${multi}` : `+${earned}`
          fbRef.current = [...fbRef.current, { id: fbId, x: item.x, y: item.y, text: label, color: def.isRare ? 'rgba(255,215,0,1)' : 'rgba(61,255,110,1)' }]
        }
        setTimeout(() => { fbRef.current = fbRef.current.filter(f => f.id !== fbId) }, 900)
        break
      }
    }
  }

  function endGame() {
    phaseRef.current = 'ended'; setPhase('ended')
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const score = scoreRef.current
    setResult({ score, rank: null, bestScore: score })
    if (isLoggedIn && sessionToken) {
      fetch('/api/game', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` }, body: JSON.stringify({ score }) })
        .then(r => r.json()).then(d => { setResult({ score, rank: d.rank ?? null, bestScore: d.bestScore ?? score }); fetchLeaderboard() })
        .catch(() => fetchLeaderboard())
    } else { fetchLeaderboard() }
  }

  const canPlay = playsToday < MAX_PLAYS
  const multi = comboMultiplier(displayCombo)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 62px)', paddingBottom: 80 }}>
      <style>{`
        @keyframes bud-fb{from{opacity:1;transform:translateY(0) scale(1.3)}to{opacity:0;transform:translateY(-70px) scale(.8)}}
        @keyframes bud-shake{0%,100%{transform:translate(0,0)}20%{transform:translate(-5px,3px)}40%{transform:translate(5px,-3px)}60%{transform:translate(-3px,2px)}80%{transform:translate(3px,-1px)}}
        @keyframes bud-star{0%,100%{opacity:.22;transform:scale(1)}50%{opacity:.7;transform:scale(1.4)}}
        @keyframes bud-slow{0%,100%{opacity:.6}50%{opacity:1}}
        @keyframes bud-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
        @keyframes bud-count{0%{transform:scale(1.6);opacity:0}35%{transform:scale(1);opacity:1}80%{transform:scale(.97);opacity:1}100%{transform:scale(.8);opacity:0}}
      `}</style>

      {/* ── Header ── */}
      <div style={{ padding: '12px 16px 8px', background: 'var(--bg2)', borderBottom: '1px solid rgba(61,255,110,.15)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.35rem', color: 'var(--green)', textShadow: 'var(--led-green)' }}>🎮 Bud Rush</div>
          <div style={{ fontSize: '.6rem', color: 'rgba(61,255,110,.7)', background: 'rgba(61,255,110,.08)', border: '1px solid rgba(61,255,110,.2)', borderRadius: 20, padding: '2px 8px', letterSpacing: 1 }}>BETA</div>
        </div>
        <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: 2 }}>Cattura i buds · costruisci combo · il top scorer mensile vince 🏆</div>
      </div>

      {/* ── IDLE ── */}
      {phase === 'idle' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Rules */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', marginBottom: 6, color: 'var(--green)' }}>📖 Come si gioca</div>
            <div style={{ fontSize: '.76rem', color: 'var(--muted)', lineHeight: 1.65, marginBottom: 16 }}>
              Gli oggetti cadono dall&apos;alto: <strong style={{ color: 'var(--text)' }}>tocca</strong> per raccoglierli!
              Prese consecutive costruiscono la tua <strong style={{ color: 'var(--gold)' }}>combo</strong> — più alta è, più punti guadagni.
              Hai <strong style={{ color: 'var(--text)' }}>3 ❤️ vite</strong> e <strong style={{ color: 'var(--text)' }}>60 secondi</strong>: finisci le vite e la partita termina subito!
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {GAME_ITEMS.map(def => {
                const isDmg = def.isDanger || def.isSuperDanger
                const isPow = def.isSlow || def.isLife
                return (
                  <div key={def.emoji} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: isDmg ? 'rgba(232,59,59,.05)' : isPow ? 'rgba(180,150,255,.05)' : 'rgba(61,255,110,.04)', border: `1px solid ${isDmg ? 'rgba(232,59,59,.14)' : isPow ? 'rgba(180,150,255,.14)' : 'rgba(61,255,110,.1)'}` }}>
                    <span style={{ fontSize: '1.5rem', lineHeight: 1, filter: `drop-shadow(0 0 5px ${def.glow})` }}>{def.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '.73rem', color: 'var(--text)', fontWeight: 600 }}>{def.label}</div>
                      <div style={{ fontSize: '.63rem', color: isDmg ? '#e83b3b' : isPow ? 'rgba(200,160,255,1)' : 'var(--green)' }}>
                        {def.isSlow ? '⏱ Rallenta 3s' : def.isLife ? '+1 ❤️ vita' : def.pts > 0 ? `+${def.pts} pt base` : `${def.pts} pt · -${def.isSuperDanger ? 2 : 1}❤️`}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Combo system */}
          <div style={{ background: 'rgba(245,200,66,.04)', border: '1px solid rgba(245,200,66,.14)', borderRadius: 'var(--radius)', padding: '14px' }}>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.92rem', color: 'var(--gold)', marginBottom: 10 }}>⚡ Sistema Combo</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {([['3+', '×1.5', '#3dff6e'], ['5+', '×2', '#f5c842'], ['8+', '×3 🔥', '#ff6b35']] as const).map(([hits, m, color]) => (
                <div key={hits} style={{ flex: 1, textAlign: 'center', padding: '9px 4px', background: 'rgba(0,0,0,.2)', border: `1px solid ${color}22`, borderRadius: 10 }}>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.15rem', color, lineHeight: 1 }}>{m}</div>
                  <div style={{ fontSize: '.62rem', color: 'var(--muted)', marginTop: 3 }}>{hits} di fila</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '.65rem', color: 'rgba(106,138,106,.6)', marginTop: 10, textAlign: 'center' }}>Il moltiplicatore si azzera colpendo una trappola 💣🚔</div>
          </div>

          {/* Tips */}
          <div style={{ background: 'rgba(61,255,110,.03)', border: '1px solid rgba(61,255,110,.08)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.88rem', color: 'var(--text)', marginBottom: 8 }}>💡 Consigli</div>
            {[
              '🍯 Hash e 💎 Crystal valgono di più — prioritizza quelli ad alta quota',
              '💨 Fumata rallenta TUTTO: usala per fare combo con gli oggetti rari',
              '🚔 Polizia è pericolosa: -2 vite e azzera la combo',
              '⭐ Stella Oro è rarissima: +15pt base × il tuo moltiplicatore!',
            ].map((tip, i) => (
              <div key={i} style={{ fontSize: '.7rem', color: 'var(--muted)', lineHeight: 1.55, padding: '3px 0', borderBottom: i < 3 ? '1px solid rgba(61,255,110,.05)' : 'none' }}>{tip}</div>
            ))}
          </div>

          {/* Start */}
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 12 }}>
              Partite oggi: <strong style={{ color: canPlay ? 'var(--green)' : '#e83b3b' }}>{playsToday}/{MAX_PLAYS}</strong>
            </div>
            <button
              onClick={() => canPlay && startCountdown()}
              disabled={!canPlay}
              style={{ background: canPlay ? 'linear-gradient(135deg,rgba(61,255,110,.24),rgba(61,255,110,.1))' : 'rgba(106,138,106,.06)', border: `1.5px solid ${canPlay ? 'rgba(61,255,110,.55)' : 'rgba(106,138,106,.15)'}`, borderRadius: 18, padding: '15px 50px', fontFamily: "'Fredoka One', cursive", fontSize: '1.1rem', color: canPlay ? 'var(--green)' : 'var(--muted)', cursor: canPlay ? 'pointer' : 'default', boxShadow: canPlay ? '0 0 36px rgba(61,255,110,.22)' : 'none', animation: canPlay ? 'bud-pulse 2.5s ease infinite' : 'none', transition: 'all .2s' }}
            >
              {canPlay ? '🎮 Inizia Partita' : '⏰ Torna Domani'}
            </button>
          </div>

          <GameLeaderboard entries={leaderboard} />
        </div>
      )}

      {/* ── COUNTING ── */}
      {phase === 'counting' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'radial-gradient(ellipse at 50% 40%,rgba(61,255,110,.1) 0%,transparent 70%)' }}>
          <div key={countdown} style={{ fontFamily: "'Fredoka One', cursive", fontSize: '9rem', color: 'var(--green)', textShadow: 'var(--led-green)', lineHeight: 1, animation: 'bud-count .9s ease forwards' }}>{countdown}</div>
          <div style={{ color: 'var(--muted)', fontSize: '.9rem', letterSpacing: 2 }}>PREPARATI...</div>
        </div>
      )}

      {/* ── PLAYING ── */}
      {phase === 'playing' && (
        <div
          key={shakeKey}
          ref={gameAreaRef}
          onTouchStart={e => { e.preventDefault(); handleTap(e) }}
          onClick={handleTap}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', userSelect: 'none', touchAction: 'none', cursor: 'crosshair', minHeight: 400, background: 'radial-gradient(ellipse at 50% 5%,rgba(61,255,110,.09) 0%,transparent 55%),radial-gradient(ellipse at 85% 90%,rgba(61,40,180,.05) 0%,transparent 45%)', animation: shakeKey > 0 ? 'bud-shake .35s ease' : 'none' }}
        >
          {/* Animated bg stars */}
          {BG_STARS.map(s => (
            <div key={s.id} style={{ position: 'absolute', left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, borderRadius: '50%', background: 'rgba(61,255,110,.28)', pointerEvents: 'none', animation: `bud-star ${s.dur}s ${s.delay}s infinite ease-in-out` }} />
          ))}

          {/* HUD */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '7px 14px 6px', background: 'rgba(8,12,8,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(61,255,110,.12)' }}>
            <div>
              <div style={{ fontSize: '.5rem', color: 'var(--muted)', letterSpacing: '.8px', textTransform: 'uppercase' }}>Punti</div>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.85rem', color: 'var(--green)', textShadow: 'var(--led-green)', lineHeight: 1 }}>{displayScore}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ fontSize: '1rem', letterSpacing: 3 }}>
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} style={{ opacity: i < displayLives ? 1 : .18, filter: i < displayLives ? 'drop-shadow(0 0 3px rgba(255,80,80,.7))' : 'none' }}>❤️</span>
                ))}
              </div>
              {displaySlowed && <div style={{ fontSize: '.52rem', color: 'rgba(200,160,255,1)', letterSpacing: 1, animation: 'bud-slow .7s infinite' }}>⏱ SLOW</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '.5rem', color: 'var(--muted)', letterSpacing: '.8px', textTransform: 'uppercase' }}>Tempo</div>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.85rem', lineHeight: 1, color: displayTime <= 10 ? '#e83b3b' : 'var(--text)', transition: 'color .3s' }}>{displayTime}</div>
            </div>
          </div>

          {/* Combo indicator */}
          {displayCombo >= 3 && (
            <div style={{ position: 'absolute', top: 58, left: '50%', transform: 'translateX(-50%)', zIndex: 15, pointerEvents: 'none', textAlign: 'center', whiteSpace: 'nowrap' }}>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: displayCombo >= 8 ? '1.35rem' : '1.05rem', lineHeight: 1, color: displayCombo >= 8 ? '#ff6b35' : displayCombo >= 5 ? '#f5c842' : 'var(--green)', textShadow: displayCombo >= 8 ? '0 0 24px rgba(255,107,53,.8)' : displayCombo >= 5 ? '0 0 18px rgba(245,200,66,.7)' : 'var(--led-green)' }}>
                {displayCombo >= 8 ? `🔥 ×${multi} FIRE!` : `⚡ ×${multi} COMBO`}
              </div>
              <div style={{ fontSize: '.54rem', color: 'var(--muted)', marginTop: 1 }}>{displayCombo} di fila</div>
            </div>
          )}

          {/* Items */}
          {displayItems.map(item => (
            <div key={item.id} style={{ position: 'absolute', left: item.x, top: item.y + 56, width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: item.def.isRare ? '2.5rem' : '2.1rem', pointerEvents: 'none', filter: `drop-shadow(0 0 ${item.def.isRare ? 12 : item.def.isDanger || item.def.isSuperDanger ? 8 : 5}px ${item.def.glow})` }}>{item.def.emoji}</div>
          ))}

          {/* Floating score feedback */}
          {displayFb.map(fb => (
            <div key={fb.id} style={{ position: 'absolute', left: fb.x, top: fb.y + 44, fontFamily: "'Fredoka One', cursive", fontSize: '1.05rem', fontWeight: 900, color: fb.color, pointerEvents: 'none', animation: 'bud-fb .9s ease forwards', zIndex: 20, whiteSpace: 'nowrap', textShadow: `0 0 10px ${fb.color}` }}>{fb.text}</div>
          ))}
        </div>
      )}

      {/* ── ENDED ── */}
      {phase === 'ended' && result && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 14px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3.2rem', marginBottom: 10, lineHeight: 1 }}>
              {result.rank === 1 ? '👑' : result.rank && result.rank <= 3 ? '🏆' : result.score >= 50 ? '🌿' : '🎮'}
            </div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem', marginBottom: 6, color: 'var(--text)' }}>Partita finita!</div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '4rem', color: 'var(--green)', textShadow: 'var(--led-green)', lineHeight: 1 }}>{result.score}</div>
            <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>
              {result.rank != null
                ? result.rank === 1 ? '🥇 Sei il leader di questo mese!'
                  : result.rank <= 3 ? `🏆 Sei #${result.rank} in classifica!`
                  : `Sei #${result.rank} nella classifica mensile`
                : isLoggedIn ? '⏳ Aggiornamento classifica...' : '⚠️ Accedi per salvare il punteggio'}
            </div>
            {result.bestScore > result.score && (
              <div style={{ fontSize: '.7rem', color: 'var(--gold)', marginTop: 6 }}>Il tuo record: <strong>{result.bestScore}</strong> 🏅</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            {canPlay && (
              <button onClick={startCountdown} style={{ flex: 1, padding: '12px', background: 'rgba(61,255,110,.12)', border: '1px solid rgba(61,255,110,.35)', borderRadius: 13, color: 'var(--green)', fontFamily: 'inherit', fontWeight: 700, fontSize: '.85rem', cursor: 'pointer' }}>
                🎮 Rigioca ({MAX_PLAYS - playsToday})
              </button>
            )}
            <button onClick={() => { setPhase('idle'); phaseRef.current = 'idle'; setResult(null) }} style={{ flex: 1, padding: '12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 13, color: 'var(--muted)', fontFamily: 'inherit', fontWeight: 700, fontSize: '.85rem', cursor: 'pointer' }}>
              📊 Classifica
            </button>
          </div>
          <GameLeaderboard entries={leaderboard} />
        </div>
      )}
    </div>
  )
}
