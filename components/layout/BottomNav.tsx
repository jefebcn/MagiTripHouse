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
        background: 'rgba(8,12,8,.97)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(61,255,110,.18)',
        display: 'flex', paddingBottom: 'env(safe-area-inset-bottom,0)',
        boxShadow: '0 -4px 30px rgba(0,0,0,.5)',
      }}
    >
      {/* Cart button */}
      <button
        onClick={() => setCartOpen(true)}
        style={{
          flex: 1, padding: '10px 0', background: 'none', border: 'none',
          color: cartCount > 0 ? 'var(--green)' : 'var(--muted)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 2, cursor: 'pointer', fontSize: '.6rem',
          position: 'relative', fontFamily: 'inherit', fontWeight: 500,
          transition: '.2s',
          textShadow: cartCount > 0 ? 'var(--led-green)' : 'none',
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>🛒</span>
        <span>Carrello</span>
        {cartCount > 0 && (
          <span className="cart-badge-pop" style={{
            position: 'absolute', top: 7, right: '50%', transform: 'translateX(12px)',
            background: 'linear-gradient(135deg,var(--green),var(--green2))',
            color: '#000', borderRadius: '50%',
            width: 17, height: 17, fontSize: '.58rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 8px rgba(61,255,110,.5)',
          }}>
            {cartCount}
          </span>
        )}
      </button>

      {TABS.map((tab) => {
        const active = view === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              flex: 1, padding: '10px 0', background: 'none', border: 'none',
              color: active ? 'var(--green)' : 'var(--muted)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, cursor: 'pointer', fontSize: '.6rem',
              textShadow: active ? 'var(--led-green)' : 'none',
              transition: '.2s', fontFamily: 'inherit', fontWeight: active ? 600 : 400,
              position: 'relative',
            }}
          >
            {active && (
              <span style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 28, height: 2,
                background: 'linear-gradient(90deg,transparent,var(--green),transparent)',
                boxShadow: '0 0 6px rgba(61,255,110,.6)',
                borderRadius: 1,
              }} />
            )}
            <span style={{ fontSize: '1.25rem' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
