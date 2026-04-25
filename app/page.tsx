'use client'
import React from 'react'
import { useUIStore } from '@/store/uiStore'
import BottomNav from '@/components/layout/BottomNav'
import AnnouncementBanner from '@/components/layout/AnnouncementBanner'
import Marquee from '@/components/layout/Marquee'
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

function AccountView() {
  const { user } = useTelegram()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        background: 'var(--card)', border: '1px solid rgba(61,255,110,.15)',
        borderRadius: 'var(--radius)', padding: 24, textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 70, height: 70, borderRadius: '50%', background: 'var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2rem', fontWeight: 800, color: '#000',
          fontFamily: "'Fredoka One', cursive", boxShadow: 'var(--led-green)',
        }}>
          {user ? user[0].toUpperCase() : '?'}
        </div>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.2rem' }}>
          {user || 'Utente'}
        </div>
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

