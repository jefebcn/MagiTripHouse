'use client'
import { useUIStore } from '@/store/uiStore'
import { useCartStore } from '@/store/cartStore'

const TABS = [
  { id: 'catalog',    label: 'Catalogo',  icon: '☰' },
  { id: 'news',       label: 'Canale',    icon: '📡' },
  { id: 'orders',     label: 'Ordini',    icon: '📋' },
  { id: 'affiliates', label: 'Affiliati', icon: '👥' },
  { id: 'account',    label: 'Account',   icon: '👤' },
] as const

export default function BottomNav() {
  const { view, setView, setCartOpen } = useUIStore()
  const items = useCartStore((s) => s.items)
  const cartCount = items.reduce((sum, x) => sum + x.qty, 0)

  return (
    <nav
      style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, zIndex: 100,
        background: 'rgba(11,16,11,.95)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(61,255,110,.15)',
        display: 'flex', paddingBottom: 'env(safe-area-inset-bottom,0)',
      }}
    >
      {/* Cart button */}
      <button
        onClick={() => setCartOpen(true)}
        style={{
          flex: 1, padding: '10px 0', background: 'none', border: 'none',
          color: 'var(--muted)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 2, cursor: 'pointer', fontSize: '.62rem',
          position: 'relative',
        }}
      >
        <span style={{ fontSize: '1.3rem' }}>🛒</span>
        <span>Carrello</span>
        {cartCount > 0 && (
          <span style={{
            position: 'absolute', top: 6, right: '50%', transform: 'translateX(10px)',
            background: 'var(--green)', color: '#000', borderRadius: '50%',
            width: 16, height: 16, fontSize: '.6rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {cartCount}
          </span>
        )}
      </button>

      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setView(tab.id)}
          style={{
            flex: 1, padding: '10px 0', background: 'none', border: 'none',
            color: view === tab.id ? 'var(--green)' : 'var(--muted)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 2, cursor: 'pointer', fontSize: '.62rem',
            textShadow: view === tab.id ? 'var(--led-green)' : 'none',
            transition: '.2s',
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
