'use client'
import React from 'react'
import { useUIStore } from '@/store/uiStore'
import BottomNav from '@/components/layout/BottomNav'
import HubView from '@/components/home/HubView'
import CatalogView from '@/components/catalog/CatalogView'
import CartDrawer from '@/components/panels/CartDrawer'
import ProductDetail from '@/components/panels/ProductDetail'
import Lightbox from '@/components/panels/Lightbox'
import { useTelegram } from '@/hooks/useTelegram'
import { useProducts } from '@/hooks/useProducts'

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

const BANNER_KEY = 'mth_banner_update_2706_dismissed'

function UpdateBanner() {
  const [visible, setVisible] = React.useState(false)
  React.useEffect(() => {
    setVisible(sessionStorage.getItem(BANNER_KEY) !== '1')
  }, [])
  if (!visible) return null
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(245,200,66,.18), rgba(245,160,0,.12))',
      border: '1px solid rgba(245,200,66,.5)',
      borderRadius: 0,
      padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 2px 12px rgba(245,200,66,.15)',
    }}>
      <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>⚙️</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: '.88rem', color: '#f5c842', letterSpacing: '.3px' }}>
          Aggiornamento piattaforma
        </div>
        <div style={{ fontSize: '.78rem', color: 'rgba(245,200,66,.75)', marginTop: 1 }}>
          Sabato 27/06 — possibili interruzioni temporanee
        </div>
      </div>
      <button
        onClick={() => { sessionStorage.setItem(BANNER_KEY, '1'); setVisible(false) }}
        style={{ background: 'none', border: 'none', color: 'rgba(245,200,66,.6)', fontSize: '1.1rem', cursor: 'pointer', padding: 4, flexShrink: 0 }}
        aria-label="Chiudi"
      >✕</button>
    </div>
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
      <UpdateBanner />

      {view === 'game' && <GameView />}

      <div style={{ display: view === 'hub' ? 'block' : 'none' }}>
        {isLoggedIn ? <HubView /> : (
          <div style={{ padding: '0 16px 100px' }}>
            <AuthView />
          </div>
        )}
      </div>

      <div style={{ display: view === 'catalog' ? 'block' : 'none' }}>
        {isLoggedIn ? <CatalogView /> : (
          <div style={{ padding: '0 16px 100px' }}>
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

      <div style={{ display: view === 'request' ? 'block' : 'none' }}>
        {gated(<RequestView />)}
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
        <button onClick={() => setView('hub')} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.3rem', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>‹</button>
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
interface StuckItem { id: number; relAngle: number; emoji: string; isObstacle: boolean; isBonus: boolean; pts: number }
interface LeaderEntry { id: string; handle: string; name: string; score: number; month: string }
interface OrderItem { id: string; total: number; date: string }

// ─── Bud Strike constants ───
const WHEEL_R = 100
const STICK_R = WHEEL_R + 18        // radius where items sit (center of emoji)
const COL_DEG = 13                  // angular collision threshold (degrees)
const BONUS_DEG = 20                // angular bonus-collect threshold
const PROJ_SPEED = 9                // pixels per frame
const MAX_LIVES_G = 3

const BG_STARS_G = Array.from({ length: 22 }, (_, i) => ({
  id: i, left: (i * 37 + 11) % 100, top: (i * 53 + 7) % 100,
  size: 1.2 + (i % 3) * 0.6, dur: 2.5 + (i % 4) * 0.8, delay: (i * 0.31) % 3.5,
}))

function gSpinSpeed(level: number) {
  // Alternates CW/CCW; speeds up each level
  return (level % 2 === 1 ? 1 : -1) * (62 + level * 16)
}
function gKnifeTarget(level: number) { return Math.min(4 + level, 13) }
function gObstacleAngles(level: number): number[] {
  if (level <= 1) return []
  const n = Math.min(level - 1, 6)
  return Array.from({ length: n }, (_, i) => Math.round((360 / n) * i))
}
function gBonusDef(level: number): { relAngle: number; emoji: string; pts: number } {
  const cycle = level % 3
  if (cycle === 0) return { relAngle: 60,  emoji: '💎', pts: 15 }
  if (cycle === 1) return { relAngle: 270, emoji: '⭐', pts: 20 }
  return              { relAngle: 150, emoji: '🍯', pts: 10 }
}
// ─── Wheel themes ───
interface WheelTheme { stops: string; border: string; glow: string; rings: string; peg: string; isBoss?: boolean }
const WHEEL_THEMES: WheelTheme[] = [
  { stops: '#6b3510 0deg,#a05a1a 30deg,#c47828 60deg,#8b4513 90deg,#5c2e06 120deg,#8b4513 150deg,#c47828 180deg,#a05a1a 210deg,#6b3510 240deg,#8b4513 270deg,#c47828 300deg,#8b4513 330deg,#6b3510 360deg', border: 'rgba(210,145,60,.7)', glow: '0 0 48px rgba(180,100,20,.38)', rings: 'rgba(220,155,65,.3)', peg: 'radial-gradient(circle at 35% 35%,#f8e060,#d4a020)' },
  { stops: '#4a0a08 0deg,#8b1a14 36deg,#c02820 72deg,#8b1a14 108deg,#4a0a08 144deg,#8b1a14 180deg,#c02820 216deg,#8b1a14 252deg,#4a0a08 288deg,#8b1a14 324deg,#4a0a08 360deg', border: 'rgba(200,60,40,.65)', glow: '0 0 48px rgba(180,40,20,.38)', rings: 'rgba(200,80,60,.3)', peg: 'radial-gradient(circle at 35% 35%,#ff9070,#c03020)' },
  { stops: '#1a2535 0deg,#2e4060 36deg,#3a5278 72deg,#2e4060 108deg,#1a2535 144deg,#2e4060 180deg,#3a5278 216deg,#2e4060 252deg,#1a2535 288deg,#2e4060 324deg,#1a2535 360deg', border: 'rgba(80,140,200,.6)', glow: '0 0 48px rgba(40,100,180,.35)', rings: 'rgba(100,160,220,.28)', peg: 'radial-gradient(circle at 35% 35%,#90c8f8,#2060c0)' },
  { stops: '#5a4200 0deg,#8b6800 36deg,#c09010 72deg,#8b6800 108deg,#5a4200 144deg,#8b6800 180deg,#c09010 216deg,#8b6800 252deg,#5a4200 288deg,#8b6800 324deg,#5a4200 360deg', border: 'rgba(220,180,40,.65)', glow: '0 0 48px rgba(200,160,20,.38)', rings: 'rgba(230,190,60,.3)', peg: 'radial-gradient(circle at 35% 35%,#fff080,#e0b000)' },
]
const BOSS_THEME: WheelTheme = { stops: '#0a0a0a 0deg,#1a1a2a 30deg,#0d0d1a 60deg,#1a1a2a 90deg,#0a0a0a 120deg,#200020 150deg,#1a1a2a 180deg,#0a0a0a 210deg,#1a1a2a 240deg,#200020 270deg,#0a0a0a 300deg,#1a1a2a 330deg,#0a0a0a 360deg', border: 'rgba(180,0,255,.7)', glow: '0 0 64px rgba(160,0,240,.48), 0 0 24px rgba(255,100,0,.2)', rings: 'rgba(180,0,255,.32)', peg: 'radial-gradient(circle at 35% 35%,#ff80ff,#8000c0)', isBoss: true }
function gWheelTheme(level: number): WheelTheme { return level % 5 === 0 ? BOSS_THEME : WHEEL_THEMES[(level - 1) % 4] }
function isBossLevel(level: number) { return level % 5 === 0 }
function gBossTarget(level: number) { return Math.min(gKnifeTarget(level) + 6, 18) }
function gBossObstacles(): number[] { return [0, 45, 90, 135, 180, 225, 270, 315] }

function gToRad(deg: number) { return deg * Math.PI / 180 }
function gPolarXY(cx: number, cy: number, angleDeg: number, r: number) {
  // 0°=top, 90°=right, 180°=bottom, 270°=left
  return { x: cx + r * Math.sin(gToRad(angleDeg)), y: cy - r * Math.cos(gToRad(angleDeg)) }
}
function gAngDist(a: number, b: number) {
  let d = Math.abs(((a - b) % 360 + 360) % 360)
  return d > 180 ? 360 - d : d
}

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
          <button onClick={() => setView('affiliates')} style={{ width: '100%', marginTop: 10, background: 'rgba(245,200,66,.1)', border: '1px solid rgba(245,200,66,.3)', borderRadius: 10, padding: '10px', color: 'var(--gold)', fontFamily: 'inherit', fontWeight: 700, fontSize: '.8rem', cursor: 'pointer' }}>
            🤝 Vedi programma affiliati completo →
          </button>
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

  const FEATURES = [
    { icon: '🔒', label: 'Sicuro' },
    { icon: '🚀', label: '24/48h' },
    { icon: '💎', label: 'Premium' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Hero */}
      <div style={{
        width: '100%', textAlign: 'center',
        padding: '32px 0 24px',
        background: 'radial-gradient(ellipse at 50% 0%,rgba(61,255,110,.08) 0%,transparent 65%)',
        marginBottom: 4,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Magic Trip House" style={{ width: 160, height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto 12px', filter: 'drop-shadow(0 0 24px rgba(61,255,110,.35))' }} />
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.15rem', marginBottom: 6, color: 'var(--text)' }}>
          {mode === 'register' ? 'Benvenuto nel negozio' : 'Bentornato 👋'}
        </div>
        <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: 18, lineHeight: 1.5 }}>
          {mode === 'register'
            ? 'Crea il tuo account gratuito per ordinare'
            : 'Accedi con le tue credenziali'}
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {FEATURES.map(f => (
            <div key={f.label} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(61,255,110,.07)', border: '1px solid rgba(61,255,110,.18)',
              borderRadius: 20, padding: '5px 12px',
              fontSize: '.74rem', color: 'rgba(125,255,164,.85)',
            }}>
              <span>{f.icon}</span>
              <span style={{ fontWeight: 600 }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mode tabs */}
      <div style={{
        display: 'flex', width: '100%', maxWidth: 340,
        background: 'var(--bg3)', borderRadius: 14, padding: 4,
        marginBottom: 20,
      }}>
        {(['register', 'login'] as const).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); reset() }}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '.85rem', fontWeight: 700, transition: '.18s',
              background: mode === m
                ? 'linear-gradient(135deg,rgba(61,255,110,.22),rgba(61,255,110,.1))'
                : 'transparent',
              color: mode === m ? 'var(--green)' : 'var(--muted)',
              boxShadow: mode === m ? 'inset 0 0 8px rgba(61,255,110,.1)' : 'none',
            }}
          >
            {m === 'register' ? '✨ Registrati' : '🔑 Accedi'}
          </button>
        ))}
      </div>

      {/* Form card */}
      <div style={{
        width: '100%', maxWidth: 340,
        background: 'var(--bg2)', border: '1px solid rgba(61,255,110,.14)',
        borderRadius: 18, padding: '22px 20px',
        display: 'flex', flexDirection: 'column', gap: 12,
        boxShadow: '0 4px 32px rgba(0,0,0,.25)',
      }}>
        {mode === 'register' ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: '.7rem', color: 'var(--muted)', letterSpacing: '.3px', textTransform: 'uppercase' }}>Nome</label>
              <input placeholder="Es. Mario" value={regName} onChange={e => { setRegName(e.target.value); reset() }} style={inputStyle()} autoComplete="name" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: '.7rem', color: 'var(--muted)', letterSpacing: '.3px', textTransform: 'uppercase' }}>Username</label>
              <input placeholder="mario_97" value={regHandle} onChange={e => { setRegHandle(e.target.value.replace(/\s/g, '')); reset() }} style={inputStyle()} autoComplete="username" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: '.7rem', color: 'var(--muted)', letterSpacing: '.3px', textTransform: 'uppercase' }}>Password</label>
              <input type="password" placeholder="Min. 6 caratteri" value={regPwd} onChange={e => { setRegPwd(e.target.value); reset() }} style={inputStyle()} autoComplete="new-password" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: '.7rem', color: 'var(--muted)', letterSpacing: '.3px', textTransform: 'uppercase' }}>Conferma password</label>
              <input type="password" placeholder="Ripeti la password" value={regPwd2} onChange={e => { setRegPwd2(e.target.value); reset() }} onKeyDown={e => e.key === 'Enter' && handleRegister()} style={inputStyle(!!error && regPwd2 !== regPwd)} autoComplete="new-password" />
            </div>
            {showAdmin && (
              <input placeholder="Codice admin" value={adminCode} onChange={e => setAdminCode(e.target.value)} style={inputStyle()} autoComplete="off" />
            )}
            <button onClick={() => setShowAdmin(v => !v)} style={{ background: 'none', border: 'none', color: 'rgba(106,138,106,.5)', fontSize: '.68rem', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>
              {showAdmin ? '▲ Nascondi codice admin' : '▼ Ho un codice admin'}
            </button>
          </>
        ) : (
          <>
            <div style={{ background: 'rgba(61,255,110,.05)', border: '1px solid rgba(61,255,110,.12)', borderRadius: 10, padding: '9px 13px', fontSize: '.72rem', color: 'var(--muted)', lineHeight: 1.55 }}>
              💡 Password dimenticata? Scrivi a <strong style={{ color: '#3b82f6' }}>@magichous8</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: '.7rem', color: 'var(--muted)', letterSpacing: '.3px', textTransform: 'uppercase' }}>Username</label>
              <input placeholder="Il tuo username" value={logHandle} onChange={e => { setLogHandle(e.target.value.replace(/\s/g, '')); reset() }} style={inputStyle()} autoComplete="username" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: '.7rem', color: 'var(--muted)', letterSpacing: '.3px', textTransform: 'uppercase' }}>Password</label>
              <input type="password" placeholder="La tua password" value={logPwd} onChange={e => { setLogPwd(e.target.value); reset() }} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={inputStyle()} autoComplete="current-password" />
            </div>
          </>
        )}

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(232,59,59,.08)', border: '1px solid rgba(232,59,59,.25)', borderRadius: 9, padding: '9px 12px', fontSize: '.76rem', color: '#ff7070' }}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={mode === 'register' ? handleRegister : handleLogin}
          disabled={loading}
          style={{
            padding: '14px', borderRadius: 12, fontFamily: 'inherit', fontWeight: 700,
            fontSize: '1rem', cursor: loading ? 'default' : 'pointer', transition: '.2s',
            background: loading
              ? 'rgba(61,255,110,.06)'
              : 'linear-gradient(135deg,rgba(61,255,110,.28),rgba(61,255,110,.15))',
            border: '1.5px solid rgba(61,255,110,.55)',
            color: 'var(--green)',
            boxShadow: loading ? 'none' : '0 0 20px rgba(61,255,110,.15)',
            marginTop: 4,
          }}
        >
          {loading ? '⏳ Attendere...' : mode === 'register' ? '🚀 Crea Account Gratuito' : '🔑 Accedi'}
        </button>
      </div>

      <div style={{ fontSize: '.72rem', color: 'rgba(106,138,106,.5)', marginTop: 10, textAlign: 'center', lineHeight: 1.6, padding: '0 16px' }}>
        🔒 Dati protetti · Nessun dato condiviso con terzi
      </div>
    </div>
  )
}

function RequestView() {
  const { products, isLoading } = useProducts()
  const { setDetailProduct, setView } = useUIStore()

  const items = products.filter(p => p.category === 'request')

  return (
    <div style={{ paddingBottom: 100 }}>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(8,12,8,.96)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(245,200,66,.12)',
        padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button
          onClick={() => setView('hub')}
          aria-label="Torna alla home"
          style={{ flexShrink: 0, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >‹</button>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.05rem' }}>📦 Su Richiesta</span>
      </div>

      {/* ── Spiegazione sezione ── */}
      <div style={{
        padding: '20px 16px 0',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>

        {/* Titolo */}
        <div>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem', marginBottom: 6 }}>
            📦 Ordinabili su Richiesta
          </div>
          <div style={{ fontSize: '.84rem', color: 'var(--muted)', lineHeight: 1.65 }}>
            Questa sezione raccoglie prodotti <strong style={{ color: 'var(--text)' }}>non disponibili nel nostro stock locale</strong>, ma che puoi ordinare appositamente per te. Una volta ricevuto il pagamento, procediamo con l&apos;ordine e la spedizione.
          </div>
        </div>

        {/* Card spiegazione principale */}
        <div style={{
          background: 'linear-gradient(135deg,#1a1200 0%,#2a1e00 60%,#1a1200 100%)',
          border: '1px solid rgba(245,200,66,.35)',
          borderRadius: 16, padding: '16px 18px',
          display: 'flex', flexDirection: 'column', gap: 12,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(90deg,transparent,rgba(245,200,66,.03),transparent)',
            animation: 'shimmer 4s ease infinite',
          }} />

          {/* Riga tempi */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(245,200,66,.12)', border: '1.5px solid rgba(245,200,66,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
            }}>🕐</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.86rem', color: 'var(--gold)', marginBottom: 3 }}>
                Tempi di consegna: 4-5 giorni lavorativi
              </div>
              <div style={{ fontSize: '.72rem', color: 'rgba(245,200,66,.65)', lineHeight: 1.5 }}>
                I tempi partono dal momento in cui riceviamo il pagamento, non dall&apos;ordine.
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(245,200,66,.12)' }} />

          {/* Punti chiave */}
          {[
            { icon: '📦', text: 'Packaging discreto garantito — nessun riferimento al contenuto' },
            { icon: '🇮🇹', text: 'Spedizione in tutta Italia tramite corriere espresso' },
            { icon: '💬', text: 'Ti aggiorneremo via Telegram sull\'andamento dell\'ordine' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
              <span style={{ fontSize: '.76rem', color: 'rgba(245,200,66,.7)', lineHeight: 1.55 }}>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Come funziona — steps */}
        <div>
          <div style={{ fontSize: '.7rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 700, marginBottom: 10 }}>
            Come funziona
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {[
              { n: '1', icon: '🛒', text: 'Scegli e aggiungi al carrello' },
              { n: '2', icon: '💬', text: 'Confermi su Telegram' },
              { n: '3', icon: '💰', text: 'Pagamento ricevuto' },
              { n: '4', icon: '🚚', text: 'Spedito in 4-5 gg' },
            ].map((s, i, arr) => (
              <React.Fragment key={s.n}>
                <div style={{
                  flex: 1, textAlign: 'center',
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 4px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                  <div style={{ fontSize: '1.1rem' }}>{s.icon}</div>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.85rem', color: 'var(--gold)' }}>{s.n}</div>
                  <div style={{ fontSize: '.55rem', color: 'var(--muted)', lineHeight: 1.3, maxWidth: 52 }}>{s.text}</div>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ color: 'rgba(245,200,66,.3)', fontSize: '.75rem', flexShrink: 0, padding: '0 2px' }}>›</div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: 'rgba(61,255,110,.08)', margin: '4px 0' }} />

        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.9rem', color: 'var(--muted)', letterSpacing: '.3px' }}>
          🌿 Prodotti disponibili
        </div>
      </div>

      {/* Product list */}
      {isLoading ? (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton-shine" style={{ height: 88, borderRadius: 14 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '48px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: 6 }}>Nessun prodotto disponibile</div>
          <div style={{ fontSize: '.78rem', opacity: .6 }}>Presto nuovi prodotti ordinabili</div>
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(p => {
            const firstVariant = p.variants?.[0]
            const priceFrom = firstVariant?.price ?? 0
            return (
              <div
                key={p.id}
                onClick={() => setDetailProduct(p)}
                style={{
                  background: 'var(--card)',
                  border: '1px solid rgba(245,200,66,.15)',
                  borderRadius: 14, padding: '12px 14px',
                  display: 'flex', gap: 14, alignItems: 'center',
                  cursor: 'pointer', transition: '.15s',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Thumb */}
                <div style={{
                  width: 64, height: 64, borderRadius: 10, overflow: 'hidden',
                  background: 'var(--bg3)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {p.imageUrl ? (
                    p.mediaType === 'video'
                      ? <span style={{ fontSize: '1.5rem' }}>▶</span>
                      // eslint-disable-next-line @next/next/no-img-element
                      : <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '2rem' }}>{p.emoji}</span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </div>
                  {p.origin && (
                    <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 4 }}>🌍 {p.origin}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', color: 'var(--green)' }}>
                      da €{priceFrom}
                    </span>
                    <span style={{
                      fontSize: '.6rem', fontWeight: 700,
                      background: 'rgba(245,200,66,.12)', border: '1px solid rgba(245,200,66,.3)',
                      borderRadius: 20, padding: '2px 8px', color: 'var(--gold)',
                      letterSpacing: '.3px',
                    }}>
                      🕐 4-5 gg
                    </span>
                  </div>
                </div>

                <span style={{ color: 'var(--muted)', fontSize: '1rem' }}>›</span>
              </div>
            )
          })}
        </div>
      )}
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

const TIER_META = {
  bronze: { label: 'Bronze',  emoji: '🥉', color: '#cd7f32', bg: 'rgba(205,127,50,.12)',  border: 'rgba(205,127,50,.35)', rate: 5,  next: 5  },
  silver: { label: 'Silver',  emoji: '🥈', color: '#a8a9ad', bg: 'rgba(168,169,173,.12)', border: 'rgba(168,169,173,.35)', rate: 8,  next: 15 },
  gold:   { label: 'Gold',    emoji: '🥇', color: '#f5c842', bg: 'rgba(245,200,66,.14)',  border: 'rgba(245,200,66,.45)',  rate: 12, next: null },
}

interface AffMe {
  code: string; tier: string; commissionEarned: number; commissionPaid: number
  referralCount: number; referralRevenue: number; referralOrders: number
  balance: number; pendingPayout: number
  payouts: { id: string; amount: number; status: string; method: string; requestedAt: string; processedAt?: string }[]
}

function AffiliatesView() {
  const { userHandle, isLoggedIn, setView } = useUIStore()
  const [data, setData] = React.useState<AffMe | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!isLoggedIn || !userHandle) return
    setLoading(true)
    // Ensure affiliate record exists then fetch stats
    fetch('/api/affiliates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: userHandle }) })
      .then(() => fetch(`/api/affiliates/me?username=${userHandle}`))
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [isLoggedIn, userHandle])

  function copyCode() {
    if (!data) return
    navigator.clipboard.writeText(data.code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (!isLoggedIn) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '48px 24px', fontSize: '.88rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>🤝</div>
        Accedi per vedere il tuo programma affiliati
      </div>
    )
  }

  if (loading) {
    return <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 48 }}>Caricamento...</div>
  }

  const tier = (data?.tier ?? 'bronze') as keyof typeof TIER_META
  const meta = TIER_META[tier] ?? TIER_META.bronze
  const nextMeta = tier === 'bronze' ? TIER_META.silver : tier === 'silver' ? TIER_META.gold : null
  const progressPct = nextMeta
    ? Math.min(100, ((data?.referralCount ?? 0) / (meta.next ?? 1)) * 100)
    : 100

  return (
    <div style={{ padding: '0 0 24px' }}>

      {/* Header with back to hub */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button
          onClick={() => setView('hub')}
          aria-label="Torna alla home"
          style={{ flexShrink: 0, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >‹</button>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.15rem' }}>🤝 Affiliati</span>
      </div>

      {/* Tier hero */}
      <div style={{
        background: `linear-gradient(135deg, ${meta.bg}, transparent)`,
        border: `1px solid ${meta.border}`,
        borderRadius: 16, padding: '18px 16px', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{ fontSize: '2.8rem', lineHeight: 1 }}>{meta.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem', color: meta.color }}>{meta.label}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 2 }}>
            {meta.rate}% di commissione su ogni ordine dei tuoi referral
          </div>
          {nextMeta && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.62rem', color: 'var(--muted)', marginBottom: 4 }}>
                <span>{data?.referralCount ?? 0} referral</span>
                <span>{meta.next} per {nextMeta.label} ({nextMeta.rate}%)</span>
              </div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: meta.color, borderRadius: 2, transition: 'width .5s' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { icon: '👥', label: 'Referral', value: data?.referralCount ?? 0, color: '#3b82f6' },
          { icon: '📦', label: 'Ordini generati', value: data?.referralOrders ?? 0, color: 'var(--green)' },
          { icon: '💶', label: 'Totale maturato', value: `€${(data?.commissionEarned ?? 0).toFixed(2)}`, color: 'var(--gold)' },
          { icon: '💰', label: 'Saldo disponibile', value: `€${(data?.balance ?? 0).toFixed(2)}`, color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '12px 14px',
          }}>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 4 }}>{s.icon} {s.label}</div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.25rem', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Referral code */}
      <div style={{
        background: 'rgba(245,200,66,.06)', border: '1.5px solid rgba(245,200,66,.3)',
        borderRadius: 14, padding: '14px 16px', marginBottom: 14,
      }}>
        <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 8 }}>🔗 Il tuo codice referral</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 800,
            letterSpacing: '3px', color: 'var(--gold)', flex: 1,
          }}>{data?.code ?? '——'}</div>
          <button
            onClick={copyCode}
            style={{
              background: copied ? 'rgba(61,255,110,.15)' : 'rgba(245,200,66,.12)',
              border: `1px solid ${copied ? 'rgba(61,255,110,.4)' : 'rgba(245,200,66,.4)'}`,
              color: copied ? 'var(--green)' : 'var(--gold)',
              borderRadius: 10, padding: '8px 14px',
              fontFamily: 'inherit', fontWeight: 700, fontSize: '.82rem', cursor: 'pointer',
            }}
          >{copied ? '✓ Copiato' : '📋 Copia'}</button>
        </div>
        <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: 8 }}>
          Condividi questo codice: ogni utente che si registra con il tuo codice ti viene attribuito e guadagni sul suo primo ordine.
        </div>
      </div>

      {/* Cart credit callout */}
      <div style={{
        background: (data?.balance ?? 0) > 0 ? 'rgba(61,255,110,.07)' : 'var(--bg3)',
        border: `1.5px solid ${(data?.balance ?? 0) > 0 ? 'rgba(61,255,110,.35)' : 'var(--border)'}`,
        borderRadius: 14, padding: '13px 16px', marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: '1.6rem' }}>🛒</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '.85rem', color: (data?.balance ?? 0) > 0 ? 'var(--green)' : 'var(--muted)' }}>
            {(data?.balance ?? 0) > 0
              ? `€${(data!.balance).toFixed(2)} di credito disponibile`
              : 'Nessun credito disponibile'}
          </div>
          <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: 2 }}>
            Il credito si applica direttamente nel carrello come sconto
          </div>
        </div>
      </div>

      {/* Come funziona — tier table */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '14px 16px', marginBottom: 14,
      }}>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.9rem', marginBottom: 12 }}>📋 Come funziona</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.entries(TIER_META).map(([key, t]) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: tier === key ? t.bg : 'transparent',
              border: `1px solid ${tier === key ? t.border : 'transparent'}`,
              borderRadius: 10, padding: '8px 10px',
            }}>
              <span style={{ fontSize: '1.2rem' }}>{t.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '.82rem', fontWeight: 700, color: t.color }}>{t.label}</div>
                <div style={{ fontSize: '.65rem', color: 'var(--muted)' }}>
                  {key === 'bronze' ? '0–4 referral' : key === 'silver' ? '5–14 referral' : '15+ referral'}
                </div>
              </div>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.1rem', color: t.color }}>
                {t.rate}%
              </div>
              {tier === key && <div style={{ fontSize: '.65rem', color: t.color, fontWeight: 700 }}>← tu</div>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: '.68rem', color: 'var(--muted)', lineHeight: 1.6 }}>
          La commissione viene maturata automaticamente su ogni ordine dei tuoi referral.
          Il credito si usa come sconto direttamente nel carrello al momento dell&apos;ordine.
        </div>
      </div>

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
  const MAX_PLAYS = 3

  type Phase = 'idle' | 'counting' | 'playing' | 'levelclear' | 'ended'
  const [phase, setPhase] = React.useState<Phase>('idle')
  const [countdown, setCountdown] = React.useState(3)
  const [displayScore, setDisplayScore] = React.useState(0)
  const [displayLives, setDisplayLives] = React.useState(MAX_LIVES_G)
  const [displayLevel, setDisplayLevel] = React.useState(1)
  const [displayDone, setDisplayDone] = React.useState(0)
  const [displayTarget, setDisplayTarget] = React.useState(gKnifeTarget(1))
  const [displayWheelAngle, setDisplayWheelAngle] = React.useState(0)
  const [displayProjY, setDisplayProjY] = React.useState(400)
  const [displayProjFlying, setDisplayProjFlying] = React.useState(false)
  const [displayStuck, setDisplayStuck] = React.useState<StuckItem[]>([])
  const [displayCX, setDisplayCX] = React.useState(180)
  const [displayCY, setDisplayCY] = React.useState(220)
  const [displaySpinDir, setDisplaySpinDir] = React.useState<'↻' | '↺'>('↻')
  const [levelClearMsg, setLevelClearMsg] = React.useState('')
  const [hitFlash, setHitFlash] = React.useState(false)
  const [bonusFlash, setBonusFlash] = React.useState<{ text: string; x: number; y: number } | null>(null)
  const [result, setResult] = React.useState<{ score: number; rank: number | null; bestScore: number } | null>(null)
  const [leaderboard, setLeaderboard] = React.useState<LeaderEntry[]>([])
  const [playsToday, setPlaysToday] = React.useState(0)
  const [showInfo, setShowInfo] = React.useState(false)

  const wheelAngleRef = React.useRef(0)
  const projYRef = React.useRef(400)
  const projFlyingRef = React.useRef(false)
  const canThrowRef = React.useRef(true)
  const stuckRef = React.useRef<StuckItem[]>([])
  const livesRef = React.useRef(MAX_LIVES_G)
  const scoreRef = React.useRef(0)
  const levelRef = React.useRef(1)
  const doneRef = React.useRef(0)
  const targetRef = React.useRef(gKnifeTarget(1))
  const phaseRef = React.useRef<Phase>('idle')
  const rafRef = React.useRef<number>(0)
  const lastTimeRef = React.useRef(0)
  const nextIdRef = React.useRef(0)
  const gameAreaRef = React.useRef<HTMLDivElement>(null)
  const cxRef = React.useRef(180)
  const cyRef = React.useRef(220)

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

  function startCountdown() {
    setPhase('counting'); phaseRef.current = 'counting'; setCountdown(3)
    let c = 3
    const iv = setInterval(() => { c--; if (c <= 0) { clearInterval(iv); startGame() } else setCountdown(c) }, 1000)
  }

  function initLevel(level: number): boolean {
    const ga = gameAreaRef.current
    if (!ga) return false
    const gH = ga.clientHeight, gW = ga.clientWidth
    const cx = gW / 2, cy = gH * 0.40
    cxRef.current = cx; cyRef.current = cy
    setDisplayCX(cx); setDisplayCY(cy)

    const startY = gH - 52
    projYRef.current = startY; projFlyingRef.current = false; canThrowRef.current = true
    setDisplayProjY(startY); setDisplayProjFlying(false)

    const items: StuckItem[] = []
    const obstAngles = isBossLevel(level) ? gBossObstacles() : gObstacleAngles(level)
    obstAngles.forEach(a => {
      items.push({ id: nextIdRef.current++, relAngle: a, emoji: '🌿', isObstacle: true, isBonus: false, pts: 0 })
    })
    const bd = gBonusDef(level)
    const bonusPts = isBossLevel(level) ? bd.pts * 2 : bd.pts
    items.push({ id: nextIdRef.current++, relAngle: bd.relAngle, emoji: bd.emoji, isObstacle: false, isBonus: true, pts: bonusPts })
    stuckRef.current = items; setDisplayStuck([...items])

    const lvTarget = isBossLevel(level) ? gBossTarget(level) : gKnifeTarget(level)
    doneRef.current = 0; targetRef.current = lvTarget
    setDisplayDone(0); setDisplayTarget(lvTarget)
    setDisplayLevel(level); levelRef.current = level
    setDisplaySpinDir(gSpinSpeed(level) > 0 ? '↻' : '↺')
    return true
  }

  function startGame() {
    scoreRef.current = 0; livesRef.current = MAX_LIVES_G; levelRef.current = 1
    wheelAngleRef.current = 0; nextIdRef.current = 0
    setDisplayScore(0); setDisplayLives(MAX_LIVES_G); setDisplayLevel(1); setResult(null)
    const n = parseInt(localStorage.getItem(todayKey()) ?? '0') + 1
    localStorage.setItem(todayKey(), String(n)); setPlaysToday(n)
    setPhase('playing'); phaseRef.current = 'playing'
    const tryStart = () => {
      if (!initLevel(1)) { requestAnimationFrame(tryStart); return }
      lastTimeRef.current = performance.now()
      rafRef.current = requestAnimationFrame(loop)
    }
    requestAnimationFrame(tryStart)
  }

  function loop(now: number) {
    if (phaseRef.current !== 'playing') return
    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05)
    lastTimeRef.current = now
    const ga = gameAreaRef.current
    if (!ga) { rafRef.current = requestAnimationFrame(loop); return }
    const gH = ga.clientHeight, gW = ga.clientWidth
    const cx = gW / 2, cy = gH * 0.40
    cxRef.current = cx; cyRef.current = cy

    // Rotate wheel
    wheelAngleRef.current += gSpinSpeed(levelRef.current) * dt
    const wAngle = wheelAngleRef.current

    // Move projectile upward
    if (projFlyingRef.current) {
      projYRef.current -= PROJ_SPEED

      // Arrival check: projectile center at cy + STICK_R from above
      if (projYRef.current <= cy + STICK_R) {
        const arrivalAngle = 180  // always from bottom (6 o'clock)
        let collision = false
        let bonusHit: StuckItem | null = null

        for (const item of stuckRef.current) {
          const wa = ((item.relAngle + wAngle) % 360 + 360) % 360
          const d = gAngDist(wa, arrivalAngle)
          if (!item.isBonus && d < COL_DEG) { collision = true; break }
          if (item.isBonus && d < BONUS_DEG && !bonusHit) bonusHit = item
        }

        if (collision) {
          livesRef.current = Math.max(0, livesRef.current - 1)
          setDisplayLives(livesRef.current)
          setHitFlash(true); setTimeout(() => setHitFlash(false), 400)
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([80, 30, 80])
          projFlyingRef.current = false; projYRef.current = gH - 52; canThrowRef.current = true
          setDisplayProjFlying(false); setDisplayProjY(gH - 52)
          if (livesRef.current <= 0) { endGame(); return }
        } else {
          // Stick!
          const newRelAngle = arrivalAngle - wAngle
          const stuck: StuckItem = { id: nextIdRef.current++, relAngle: newRelAngle, emoji: '🌿', isObstacle: false, isBonus: false, pts: 0 }
          let pts = 5 + (levelRef.current - 1)

          if (bonusHit) {
            pts += bonusHit.pts
            stuckRef.current = stuckRef.current.filter(i => i.id !== bonusHit!.id)
            const bp = gPolarXY(cx, cy, arrivalAngle, STICK_R)
            setBonusFlash({ text: `+${bonusHit.pts} ${bonusHit.emoji}`, x: bp.x, y: bp.y })
            setTimeout(() => setBonusFlash(null), 1000)
          }
          scoreRef.current += pts
          stuckRef.current = [...stuckRef.current, stuck]
          doneRef.current += 1
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(14)

          projFlyingRef.current = false; projYRef.current = gH - 52; canThrowRef.current = true

          if (doneRef.current >= targetRef.current) {
            const bonus = 15 * levelRef.current
            scoreRef.current += bonus
            setDisplayScore(scoreRef.current)
            setDisplayStuck([...stuckRef.current])
            const nextLv = levelRef.current + 1
            phaseRef.current = 'levelclear'; setPhase('levelclear')
            setLevelClearMsg(isBossLevel(levelRef.current) ? `BOSS SCONFITTO! 💀! +${bonus} bonus` : `Livello ${levelRef.current} superato! +${bonus} bonus`)
            setTimeout(() => {
              if (phaseRef.current !== 'levelclear') return
              levelRef.current = nextLv; phaseRef.current = 'playing'; setPhase('playing')
              if (!initLevel(nextLv)) return
              lastTimeRef.current = performance.now()
              rafRef.current = requestAnimationFrame(loop)
            }, 1800)
            return
          }
        }
      }
    }

    setDisplayWheelAngle(wAngle)
    setDisplayProjY(projYRef.current)
    setDisplayProjFlying(projFlyingRef.current)
    setDisplayStuck([...stuckRef.current])
    setDisplayScore(scoreRef.current)
    setDisplayLives(livesRef.current)
    setDisplayDone(doneRef.current)
    setDisplayCX(cx); setDisplayCY(cy)
    rafRef.current = requestAnimationFrame(loop)
  }

  function throwProjectile() {
    if (phaseRef.current !== 'playing') return
    if (projFlyingRef.current || !canThrowRef.current) return
    canThrowRef.current = false; projFlyingRef.current = true
    setDisplayProjFlying(true)
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
  const showGame = phase === 'playing' || phase === 'levelclear'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 62px)' }}>
      <style>{`
        @keyframes kh-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
        @keyframes kh-count{0%{transform:scale(1.6);opacity:0}40%{transform:scale(1);opacity:1}80%{opacity:1}100%{transform:scale(.85);opacity:0}}
        @keyframes kh-levelup{0%{opacity:0;transform:scale(.85)}15%{opacity:1;transform:scale(1.06)}70%{opacity:1;transform:scale(1)}100%{opacity:0;transform:translateY(-28px)}}
        @keyframes kh-flash{0%,100%{background:transparent}50%{background:rgba(232,59,59,.28)}}
        @keyframes kh-bonus{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-56px) scale(.8)}}
        @keyframes kh-fadein{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
        @keyframes kh-star{0%,100%{opacity:.12}50%{opacity:.45}}
        @keyframes kh-proj{0%,100%{transform:scaleY(1) scaleX(1)}50%{transform:scaleY(.9) scaleX(1.1)}}
        @keyframes kh-stick{0%{opacity:0;transform:scale(.5)}100%{opacity:1;transform:scale(1)}}
        @keyframes kh-preview-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>

      {/* ── Header (hidden on idle — title is part of the start screen) ── */}
      {phase !== 'idle' && (
        <div style={{ padding: '10px 16px 8px', background: 'var(--bg2)', borderBottom: '1px solid rgba(61,255,110,.15)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem', color: 'var(--green)', textShadow: 'var(--led-green)' }}>🎯 Bud Strike</div>
            <div style={{ fontSize: '.58rem', color: 'rgba(61,255,110,.7)', background: 'rgba(61,255,110,.08)', border: '1px solid rgba(61,255,110,.2)', borderRadius: 20, padding: '2px 8px', letterSpacing: 1 }}>v3</div>
          </div>
          <div style={{ fontSize: '.67rem', color: 'var(--muted)', marginTop: 2 }}>Tocca per lanciare · colpisci il bersaglio · schiva i nodi</div>
        </div>
      )}

      {/* ── IDLE ── */}
      {phase === 'idle' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {/* BG glow + stars */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 28%,rgba(61,255,110,.12) 0%,transparent 62%)', pointerEvents: 'none' }} />
          {BG_STARS_G.slice(0, 14).map(s => (
            <div key={s.id} style={{ position: 'absolute', left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, borderRadius: '50%', background: 'rgba(61,255,110,.3)', pointerEvents: 'none', animation: `kh-star ${s.dur}s ${s.delay}s infinite ease-in-out` }} />
          ))}

          {!showInfo ? (
            /* ── MAIN START SCREEN ── */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 18px', position: 'relative', zIndex: 1 }}>

              {/* Title */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '3.2rem', lineHeight: 1, color: 'var(--green)', textShadow: '0 0 40px rgba(61,255,110,.65), 0 3px 0 rgba(0,50,0,.9)' }}>BUD</div>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '3.2rem', lineHeight: 1, color: 'var(--gold)', textShadow: '0 0 40px rgba(245,200,66,.65), 0 3px 0 rgba(50,30,0,.9)', marginTop: -6 }}>STRIKE</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                  <div style={{ height: 1, width: 28, background: 'rgba(61,255,110,.3)' }} />
                  <div style={{ fontSize: '.58rem', color: 'rgba(61,255,110,.55)', letterSpacing: 2.5, textTransform: 'uppercase' }}>Precision Game</div>
                  <div style={{ height: 1, width: 28, background: 'rgba(61,255,110,.3)' }} />
                </div>
              </div>

              {/* Wheel preview */}
              <div style={{ position: 'relative', width: 210, height: 272 }}>
                {/* Rotating group: wheel disc + stuck buds */}
                <div style={{ position: 'absolute', left: 5, top: 0, width: 200, height: 200, animation: 'kh-preview-spin 5s linear infinite', transformOrigin: '50% 50%' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'conic-gradient(#5c2e06 0deg,#8b4513 36deg,#a05a1a 72deg,#7a3c0e 108deg,#5c2e06 144deg,#7a3c0e 180deg,#8b4513 216deg,#a05a1a 252deg,#7a3c0e 288deg,#5c2e06 324deg,#8b4513 360deg)', border: '3px solid rgba(195,130,50,.6)', boxShadow: '0 0 48px rgba(160,90,20,.3)', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 14, borderRadius: '50%', border: '2px solid rgba(195,130,50,.22)' }} />
                    <div style={{ position: 'absolute', inset: 30, borderRadius: '50%', border: '1px solid rgba(195,130,50,.15)' }} />
                    <div style={{ position: 'absolute', inset: 48, borderRadius: '50%', border: '1px solid rgba(195,130,50,.1)' }} />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 14, height: 14, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%,#f5d878,#c49020)', boxShadow: '0 0 10px rgba(200,160,30,.6)' }} />
                  </div>
                  {/* Stuck joints rotating with wheel */}
                  {([45, 138, 222, 312] as number[]).map(angle => {
                    const sinA = Math.sin(angle * Math.PI / 180), cosA = Math.cos(angle * Math.PI / 180)
                    const ir = 78, or = 110
                    const ix = 100 + ir * sinA, iy = 100 - ir * cosA
                    const ox = 100 + or * sinA, oy = 100 - or * cosA
                    const la = Math.atan2(oy - iy, ox - ix) * 180 / Math.PI
                    const ll = Math.sqrt((ox - ix) ** 2 + (oy - iy) ** 2)
                    return (
                      <React.Fragment key={angle}>
                        <div style={{ position: 'absolute', left: ix, top: iy - 4, width: ll, height: 8, borderRadius: 3, background: 'linear-gradient(90deg,rgba(90,55,12,.8) 0%,#e8d888 18%,#f4ecc8 48%,#dece78 80%,#9a6020 100%)', transformOrigin: '0 50%', transform: `rotate(${la}deg)` }} />
                        <div style={{ position: 'absolute', left: ox - 5, top: oy - 5, width: 10, height: 10, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%,#d4a448,#7a4820)', boxShadow: '0 0 5px rgba(180,120,40,.45)' }} />
                      </React.Fragment>
                    )
                  })}
                </div>
                {/* Dashed trajectory line */}
                <div style={{ position: 'absolute', left: 104, top: 200, width: 2, height: 16, background: 'repeating-linear-gradient(to bottom,rgba(180,130,50,.3) 0px,rgba(180,130,50,.3) 4px,transparent 4px,transparent 9px)' }} />
                {/* Projectile ready */}
                <div style={{ position: 'absolute', left: 100, top: 214, width: 10, height: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'kh-proj 1.5s ease infinite' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%,rgba(255,250,180,.75),rgba(200,120,20,.5))', boxShadow: '0 0 6px rgba(200,130,0,.5)', flexShrink: 0 }} />
                  <div style={{ width: 7, height: 5, background: 'linear-gradient(180deg,#999,#666)', borderRadius: '0 0 2px 2px', flexShrink: 0, opacity: .7 }} />
                  <div style={{ width: 10, height: 30, background: 'linear-gradient(180deg,rgba(244,236,204,.85),rgba(232,216,144,.72))', borderRadius: 2, border: '1px solid rgba(180,150,60,.28)', flexShrink: 0 }} />
                  <div style={{ width: 10, height: 13, background: 'linear-gradient(180deg,rgba(184,144,72,.8),rgba(122,72,32,.7))', borderRadius: '0 0 4px 4px', flexShrink: 0 }} />
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 2 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '.56rem', color: 'var(--muted)', letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 3 }}>Record</div>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.35rem', color: 'var(--gold)', textShadow: '0 0 14px rgba(245,200,66,.4)', lineHeight: 1 }}>
                    {leaderboard.length > 0 ? leaderboard[0].score : '—'}
                  </div>
                  {leaderboard.length > 0 && <div style={{ fontSize: '.55rem', color: 'var(--muted)', marginTop: 2 }}>@{leaderboard[0].handle}</div>}
                </div>
                <div style={{ width: 1, height: 40, background: 'rgba(61,255,110,.2)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '.56rem', color: 'var(--muted)', letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 3 }}>Partite</div>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.35rem', lineHeight: 1, color: canPlay ? 'var(--green)' : '#e83b3b' }}>
                    {playsToday}<span style={{ fontSize: '.95rem', color: 'var(--muted)' }}>/{MAX_PLAYS}</span>
                  </div>
                  <div style={{ fontSize: '.55rem', color: 'var(--muted)', marginTop: 2 }}>oggi</div>
                </div>
                <div style={{ width: 1, height: 40, background: 'rgba(61,255,110,.2)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '.56rem', color: 'var(--muted)', letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 3 }}>Stage</div>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.35rem', color: 'var(--text)', lineHeight: 1 }}>1</div>
                  <div style={{ fontSize: '.55rem', color: 'var(--muted)', marginTop: 2 }}>↻ 62°/s</div>
                </div>
              </div>

              {/* Play button + secondary buttons */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => canPlay && startCountdown()}
                  disabled={!canPlay}
                  style={{ width: '100%', padding: '18px', background: canPlay ? 'linear-gradient(180deg,rgba(61,255,110,.35) 0%,rgba(30,150,55,.25) 100%)' : 'rgba(106,138,106,.07)', border: `2px solid ${canPlay ? 'rgba(61,255,110,.7)' : 'rgba(106,138,106,.2)'}`, borderRadius: 16, fontFamily: "'Fredoka One', cursive", fontSize: '1.55rem', color: canPlay ? 'var(--green)' : 'var(--muted)', cursor: canPlay ? 'pointer' : 'default', boxShadow: canPlay ? '0 4px 0 rgba(0,70,20,.6), 0 0 48px rgba(61,255,110,.28)' : 'none', animation: canPlay ? 'kh-pulse 2.5s ease infinite' : 'none', letterSpacing: 2, textShadow: canPlay ? '0 0 20px rgba(61,255,110,.6)' : 'none' }}
                >
                  {canPlay ? 'GIOCA  ›' : '⏰  TORNA DOMANI'}
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowInfo(true)} style={{ flex: 1, padding: '10px', background: 'rgba(61,255,110,.06)', border: '1px solid rgba(61,255,110,.18)', borderRadius: 12, color: 'var(--muted)', fontFamily: 'inherit', fontSize: '.78rem', cursor: 'pointer' }}>
                    ℹ Istruzioni
                  </button>
                  <button onClick={() => setShowInfo(true)} style={{ flex: 1, padding: '10px', background: 'rgba(245,200,66,.06)', border: '1px solid rgba(245,200,66,.18)', borderRadius: 12, color: 'var(--muted)', fontFamily: 'inherit', fontSize: '.78rem', cursor: 'pointer' }}>
                    🏆 Classifica
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── INFO + LEADERBOARD PANEL ── */
            <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
              <div style={{ padding: '12px 14px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button onClick={() => setShowInfo(false)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--muted)', fontSize: '.85rem', cursor: 'pointer', padding: '2px 0', fontFamily: 'inherit', alignSelf: 'flex-start' }}>
                  ‹ Indietro
                </button>

                <div style={{ background: 'var(--card)', border: '1px solid rgba(61,255,110,.2)', borderRadius: 'var(--radius)', padding: '14px' }}>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.95rem', color: 'var(--green)', marginBottom: 10 }}>🎯 Come si gioca</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                    {[
                      { icon: '👆', t: 'Tocca', d: 'per lanciare il bud verso il bersaglio' },
                      { icon: '🌿', t: 'Atterra', d: 'il bud si conficca nel bersaglio' },
                      { icon: '💥', t: 'Schiva', d: 'non colpire i nodi già piantati!' },
                    ].map(s => (
                      <div key={s.icon} style={{ padding: '8px 4px', background: 'rgba(61,255,110,.04)', border: '1px solid rgba(61,255,110,.09)', borderRadius: 10, textAlign: 'center' }}>
                        <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{s.icon}</div>
                        <div style={{ fontSize: '.66rem', fontWeight: 700, color: 'var(--text)' }}>{s.t}</div>
                        <div style={{ fontSize: '.57rem', color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{s.d}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '.72rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                    Il bersaglio ruota più veloce ogni livello · cambia direzione alternando.<br />
                    Lancia <strong style={{ color: 'var(--text)' }}>tutti i bud</strong> senza collisioni per avanzare!
                  </div>
                </div>

                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px' }}>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.9rem', color: 'var(--text)', marginBottom: 10 }}>💎 Bonus sul bersaglio</div>
                  {[
                    { emoji: '💎', name: 'Crystal', pts: '+15 pt', desc: 'Colpisci col bud per punti extra' },
                    { emoji: '⭐', name: 'Stella Oro', pts: '+20 pt', desc: 'Rarissima — punta bene!' },
                    { emoji: '🍯', name: 'Hash', pts: '+10 pt', desc: 'Bonus solido ogni livello' },
                  ].map((item, i) => (
                    <div key={item.emoji} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < 2 ? '1px solid rgba(61,255,110,.06)' : 'none' }}>
                      <span style={{ fontSize: '1.3rem' }}>{item.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '.73rem', fontWeight: 700, color: 'var(--text)' }}>{item.name}</div>
                        <div style={{ fontSize: '.62rem', color: 'var(--muted)' }}>{item.desc}</div>
                      </div>
                      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.82rem', color: 'var(--gold)' }}>{item.pts}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'rgba(245,200,66,.04)', border: '1px solid rgba(245,200,66,.14)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.88rem', color: 'var(--gold)', marginBottom: 8 }}>⚡ Livelli</div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {[1,2,3,4,5].map(lv => (
                      <div key={lv} style={{ flex: 1, textAlign: 'center', padding: '7px 3px', background: 'rgba(0,0,0,.2)', borderRadius: 9 }}>
                        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.85rem', color: lv <= 1 ? '#3dff6e' : lv <= 3 ? '#f5c842' : '#ff6b35' }}>Lv{lv}</div>
                        <div style={{ fontSize: '.55rem', color: 'var(--muted)', marginTop: 2 }}>{gKnifeTarget(lv)} bud</div>
                        <div style={{ fontSize: '.52rem', color: 'rgba(106,138,106,.5)', marginTop: 1 }}>{gSpinSpeed(lv) > 0 ? '↻' : '↺'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'rgba(61,255,110,.03)', border: '1px solid rgba(61,255,110,.08)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                  {[
                    '🎯 Aspetta il momento giusto — il timing batte la velocità',
                    '🌿 Osserva gli spazi liberi prima di lanciare',
                    '💎 I bonus ruotano col bersaglio — prevedine la posizione',
                    '⚡ Dal livello 2 la rotazione si inverte!',
                  ].map((tip, i) => (
                    <div key={i} style={{ fontSize: '.69rem', color: 'var(--muted)', lineHeight: 1.55, padding: '4px 0', borderBottom: i < 3 ? '1px solid rgba(61,255,110,.05)' : 'none' }}>{tip}</div>
                  ))}
                </div>

                <GameLeaderboard entries={leaderboard} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── COUNTING ── */}
      {phase === 'counting' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'radial-gradient(ellipse at 50% 40%,rgba(61,255,110,.1) 0%,transparent 70%)' }}>
          <div key={countdown} style={{ fontFamily: "'Fredoka One', cursive", fontSize: '9rem', color: 'var(--green)', textShadow: 'var(--led-green)', lineHeight: 1, animation: 'kh-count .9s ease forwards' }}>{countdown}</div>
          <div style={{ color: 'var(--muted)', fontSize: '.9rem', letterSpacing: 2 }}>PREPARATI...</div>
          <div style={{ fontSize: '.7rem', color: 'rgba(106,138,106,.5)', marginTop: 4 }}>tocca lo schermo per lanciare i bud</div>
        </div>
      )}

      {/* ── PLAYING / LEVEL CLEAR ── */}
      {showGame && (
        <div
          ref={gameAreaRef}
          onPointerDown={e => { e.preventDefault(); throwProjectile() }}
          style={{
            flex: 1, position: 'relative', overflow: 'hidden',
            userSelect: 'none', touchAction: 'none', cursor: 'pointer', minHeight: 380,
            animation: hitFlash ? 'kh-flash .4s ease' : 'none',
            background: isBossLevel(displayLevel)
              ? 'radial-gradient(ellipse at 50% 38%,rgba(160,0,240,.13) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(255,50,0,.07) 0%,transparent 40%)'
              : 'radial-gradient(ellipse at 50% 38%,rgba(61,255,110,.08) 0%,transparent 60%),radial-gradient(ellipse at 20% 80%,rgba(61,40,180,.05) 0%,transparent 40%)',
          }}
        >
          {/* Background stars */}
          {BG_STARS_G.map(s => (
            <div key={s.id} style={{ position: 'absolute', left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, borderRadius: '50%', background: 'rgba(61,255,110,.32)', pointerEvents: 'none', animation: `kh-star ${s.dur}s ${s.delay}s infinite ease-in-out` }} />
          ))}

          {/* HUD */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '7px 14px 6px', background: 'rgba(8,12,8,.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(61,255,110,.1)', pointerEvents: 'none' }}>
            <div>
              <div style={{ fontSize: '.48rem', color: 'var(--muted)', letterSpacing: '.8px', textTransform: 'uppercase' }}>Punti</div>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.8rem', color: 'var(--green)', textShadow: 'var(--led-green)', lineHeight: 1 }}>{displayScore}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.72rem', color: 'var(--gold)', letterSpacing: 1 }}>LIVELLO {displayLevel} {displaySpinDir}</div>
              <div style={{ fontSize: '.9rem', letterSpacing: 3 }}>
                {Array.from({ length: MAX_LIVES_G }, (_, i) => (
                  <span key={i} style={{ opacity: i < displayLives ? 1 : .14, filter: i < displayLives ? 'drop-shadow(0 0 3px rgba(255,80,80,.7))' : 'none' }}>❤️</span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '.48rem', color: 'var(--muted)', letterSpacing: '.8px', textTransform: 'uppercase' }}>Bud</div>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.8rem', lineHeight: 1, color: 'var(--text)' }}>
                {displayDone}<span style={{ fontSize: '1rem', color: 'var(--muted)' }}>/{displayTarget}</span>
              </div>
            </div>
          </div>

          {/* Boss banner */}
          {isBossLevel(displayLevel) && (
            <div style={{ position: 'absolute', top: 52, left: 0, right: 0, textAlign: 'center', fontFamily: "'Fredoka One',cursive", fontSize: '.72rem', color: '#cc44ff', textShadow: '0 0 10px rgba(180,0,255,.65)', letterSpacing: 2, pointerEvents: 'none', zIndex: 10, paddingBottom: 2 }}>⚡ BOSS LEVEL ⚡</div>
          )}

          {/* Ammo dots below HUD */}
          <div style={{ position: 'absolute', top: isBossLevel(displayLevel) ? 68 : 52, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5, pointerEvents: 'none', zIndex: 9 }}>
            {Array.from({ length: displayTarget }, (_, i) => (
              <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i < displayDone ? 'rgba(61,255,110,.9)' : 'rgba(61,255,110,.18)', border: '1px solid rgba(61,255,110,.4)', transition: 'background .2s' }} />
            ))}
          </div>

          {/* Wheel visual — theme per level */}
          {(() => {
            const wt = gWheelTheme(displayLevel)
            return (
              <div style={{
                position: 'absolute',
                left: displayCX - WHEEL_R,
                top: displayCY - WHEEL_R,
                width: WHEEL_R * 2,
                height: WHEEL_R * 2,
                borderRadius: '50%',
                background: `conic-gradient(from ${displayWheelAngle}deg, ${wt.stops})`,
                border: `3px solid ${wt.border}`,
                boxShadow: `${wt.glow}, inset 0 0 40px rgba(0,0,0,.6)`,
                pointerEvents: 'none',
              }}>
                {/* Metallic sheen overlay */}
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 38% 32%, rgba(255,255,255,.13) 0%, transparent 54%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', inset: 12, borderRadius: '50%', border: `2px solid ${wt.rings}` }} />
                <div style={{ position: 'absolute', inset: 28, borderRadius: '50%', border: `1px solid ${wt.rings.replace('.3)', '.18)')}` }} />
                <div style={{ position: 'absolute', inset: 46, borderRadius: '50%', border: `1px solid ${wt.rings.replace('.3)', '.1)')}` }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 18, height: 18, borderRadius: '50%', background: wt.peg, boxShadow: `0 0 12px ${wt.border}, inset 0 0 5px rgba(0,0,0,.4)` }} />
                {wt.isBoss && <div style={{ position: 'absolute', inset: -7, borderRadius: '50%', border: '2px solid rgba(180,0,255,.38)', animation: 'kh-pulse 1.2s ease infinite', pointerEvents: 'none' }} />}
              </div>
            )
          })()}

          {/* Stuck items & their stick lines */}
          {displayStuck.map(item => {
            const wa = ((item.relAngle + displayWheelAngle) % 360 + 360) % 360
            const pos = gPolarXY(displayCX, displayCY, wa, STICK_R)
            const inner = gPolarXY(displayCX, displayCY, wa, WHEEL_R - 1)
            const dx = pos.x - inner.x, dy = pos.y - inner.y
            const lineLen = Math.sqrt(dx * dx + dy * dy)
            const lineAngle = Math.atan2(dy, dx) * 180 / Math.PI
            const isBonus = item.isBonus
            const isObs = item.isObstacle
            if (isBonus) {
              return (
                <div key={item.id} style={{ position: 'absolute', left: pos.x - 14, top: pos.y - 14, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', pointerEvents: 'none', filter: 'drop-shadow(0 0 9px rgba(255,215,0,.85))', zIndex: 3, animation: 'kh-stick .15s ease' }}>{item.emoji}</div>
              )
            }
            const bodyBg = isObs
              ? 'linear-gradient(90deg,rgba(80,20,10,.85) 0%,rgba(200,60,40,.75) 30%,rgba(230,90,70,.6) 65%,rgba(150,30,20,.75) 100%)'
              : 'linear-gradient(90deg,rgba(80,48,10,.85) 0%,#d4b060 10%,#f9f1d3 30%,#ead998 55%,#d4c070 82%,#8b5820 100%)'
            const capBg = isObs
              ? 'radial-gradient(circle at 35% 32%,#ff8070,#9b2222)'
              : 'radial-gradient(circle at 35% 32%,#e8b858,#8b5020)'
            const capShadow = isObs ? '0 0 8px rgba(220,60,40,.62), inset 0 1px 0 rgba(255,150,130,.3)' : '0 0 7px rgba(180,120,40,.55), inset 0 1px 0 rgba(255,220,140,.35)'
            return (
              <React.Fragment key={item.id}>
                <div style={{ position: 'absolute', left: inner.x, top: inner.y - 5.5, width: lineLen, height: 11, borderRadius: 4, background: bodyBg, transformOrigin: '0 50%', transform: `rotate(${lineAngle}deg)`, pointerEvents: 'none', zIndex: 2, boxShadow: '0 2px 5px rgba(0,0,0,.45)', animation: isObs ? 'none' : 'kh-stick .15s ease' }} />
                <div style={{ position: 'absolute', left: pos.x - 6.5, top: pos.y - 6.5, width: 13, height: 13, borderRadius: '50%', background: capBg, boxShadow: isObs ? '0 0 8px rgba(220,60,40,.6)' : '0 0 7px rgba(180,120,40,.55)', pointerEvents: 'none', zIndex: 3, animation: isObs ? 'none' : 'kh-stick .15s ease' }} />
              </React.Fragment>
            )
          })}

          {/* Flight trajectory guide (subtle dashed line) */}
          {!displayProjFlying && phase === 'playing' && (
            <div style={{ position: 'absolute', left: displayCX - 1, top: displayCY + WHEEL_R + 6, width: 2, bottom: 52, background: 'repeating-linear-gradient(to bottom,rgba(61,255,110,.2) 0px,rgba(61,255,110,.2) 4px,transparent 4px,transparent 10px)', pointerEvents: 'none', zIndex: 1 }} />
          )}

          {/* Projectile — flying */}
          {displayProjFlying && (
            <div style={{ position: 'absolute', left: displayCX - 6.5, top: displayProjY - 46, width: 13, height: 62, pointerEvents: 'none', zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Brace: lit ember tip */}
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'radial-gradient(circle at 38% 32%,#fff7c0,#ffb300 45%,#e65000)', boxShadow: '0 0 10px #ff9800, 0 0 20px rgba(255,140,0,.65)', flexShrink: 0 }} />
              {/* Ash cone */}
              <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '7px solid #a0a090', flexShrink: 0 }} />
              {/* Paper body with highlight strip */}
              <div style={{ width: 13, height: 33, position: 'relative', flexShrink: 0,
                background: 'linear-gradient(180deg,#f9f1d3 0%,#ead998 55%,#d4c070 100%)',
                backgroundImage: 'linear-gradient(180deg,#f9f1d3 0%,#ead998 55%,#d4c070 100%), repeating-linear-gradient(0deg,transparent,transparent 4px,rgba(150,120,40,.13) 4px,rgba(150,120,40,.13) 5px)',
                borderRadius: '2px 2px 0 0', border: '1px solid rgba(180,148,55,.4)',
                boxShadow: 'inset 3px 0 5px rgba(255,248,200,.5), inset -2px 0 4px rgba(0,0,0,.1)' }} />
              {/* Filter — brown with rim groove */}
              <div style={{ width: 13, height: 15, flexShrink: 0,
                background: 'linear-gradient(180deg,#d4a050 0%,#8b5020 60%,#6a3810 100%)',
                backgroundImage: 'linear-gradient(90deg,rgba(255,210,120,.28) 0%,transparent 42%,rgba(0,0,0,.18) 100%)',
                borderRadius: '0 0 5px 5px',
                boxShadow: 'inset 0 2px 0 rgba(255,200,100,.22), 0 2px 4px rgba(0,0,0,.4)',
                border: '1px solid rgba(70,35,8,.5)' }} />
            </div>
          )}

          {/* Projectile — ready at bottom */}
          {!displayProjFlying && phase === 'playing' && (
            <div style={{ position: 'absolute', left: displayCX - 6.5, top: displayProjY - 46, width: 13, height: 62, pointerEvents: 'none', zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'kh-proj 1.4s ease infinite' }}>
              {/* Ember tip (dimmer) */}
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'radial-gradient(circle at 38% 32%,rgba(255,245,160,.68),rgba(200,110,0,.45))', boxShadow: '0 0 7px rgba(200,120,0,.45)', flexShrink: 0 }} />
              {/* Ash cone */}
              <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '7px solid rgba(160,160,145,.65)', flexShrink: 0 }} />
              {/* Paper body */}
              <div style={{ width: 13, height: 33, flexShrink: 0,
                background: 'linear-gradient(180deg,rgba(249,241,211,.82),rgba(234,217,152,.68),rgba(212,196,112,.52))',
                backgroundImage: 'linear-gradient(180deg,rgba(249,241,211,.82),rgba(234,217,152,.68),rgba(212,196,112,.52)), repeating-linear-gradient(0deg,transparent,transparent 4px,rgba(150,120,40,.1) 4px,rgba(150,120,40,.1) 5px)',
                borderRadius: '2px 2px 0 0', border: '1px solid rgba(180,148,55,.25)',
                boxShadow: 'inset 3px 0 5px rgba(255,248,200,.3)' }} />
              {/* Filter */}
              <div style={{ width: 13, height: 15, flexShrink: 0,
                background: 'linear-gradient(180deg,rgba(212,160,80,.78),rgba(140,80,32,.68),rgba(106,56,16,.6))',
                borderRadius: '0 0 5px 5px',
                border: '1px solid rgba(70,35,8,.3)' }} />
            </div>
          )}

          {/* Bonus collect flash */}
          {bonusFlash && (
            <div style={{ position: 'absolute', left: bonusFlash.x - 44, top: bonusFlash.y - 28, fontFamily: "'Fredoka One', cursive", fontSize: '1.1rem', color: '#f5c842', pointerEvents: 'none', animation: 'kh-bonus .9s ease forwards', zIndex: 20, whiteSpace: 'nowrap', textShadow: '0 0 14px rgba(245,200,66,.85)' }}>{bonusFlash.text}</div>
          )}

          {/* Tap hint */}
          {!displayProjFlying && phase === 'playing' && (
            <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', fontSize: '.63rem', color: 'rgba(106,138,106,.45)', pointerEvents: 'none' }}>tocca per lanciare</div>
          )}

          {/* Level clear overlay */}
          {phase === 'levelclear' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 30, background: 'rgba(8,12,8,.6)', backdropFilter: 'blur(5px)' }}>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '2.2rem', color: 'var(--green)', textShadow: 'var(--led-green)', animation: 'kh-levelup 1.8s ease forwards', textAlign: 'center', lineHeight: 1.3 }}>
                ✅ {levelClearMsg.split('!')[0]}!
                <div style={{ fontSize: '1.1rem', color: 'var(--gold)', marginTop: 6 }}>{levelClearMsg.split('!')[1]?.trim()}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ENDED ── */}
      {phase === 'ended' && result && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 14px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'center', animation: 'kh-fadein .4s ease' }}>
            <div style={{ fontSize: '3.2rem', marginBottom: 10, lineHeight: 1 }}>
              {result.rank === 1 ? '👑' : result.rank && result.rank <= 3 ? '🏆' : displayLevel > 3 ? '🎯' : '🌿'}
            </div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem', marginBottom: 4 }}>Partita Finita!</div>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 8 }}>Sei arrivato al <strong style={{ color: 'var(--gold)' }}>livello {displayLevel}</strong></div>
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
                🎯 Rigioca ({MAX_PLAYS - playsToday})
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
