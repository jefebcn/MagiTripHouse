'use client'
import { useUIStore } from '@/store/uiStore'
import { useCartStore } from '@/store/cartStore'

const TABS = [
  { id: 'game',       label: 'Gioca',    icon: '🎮', cart: false },
  { id: 'catalog',    label: 'Catalogo', icon: '☰',  cart: false },
  { id: 'news',       label: 'Canale',   icon: '📡', cart: false },
  { id: 'cart',       label: 'Carrello', icon: '🛒', cart: true  },
  { id: 'affiliates', label: 'Affiliati',icon: '👥', cart: false },
  { id: 'account',    label: 'Account',  icon: '👤', cart: false },
] as const

export default function BottomNav() {
  const { view, setView, setCartOpen, latestNewsAt, lastReadNewsAt } = useUIStore()
  const items = useCartStore((s) => s.items)
  const cartCount = items.reduce((sum, x) => sum + x.qty, 0)
  const hasUnreadNews = !!latestNewsAt && latestNewsAt > lastReadNewsAt

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
      {TABS.map((tab) => {
        const isCart = tab.cart
        const active = !isCart && view === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => isCart ? setCartOpen(true) : setView(tab.id as Parameters<typeof setView>[0])}
            style={{
              flex: 1, padding: '10px 0', background: 'none', border: 'none',
              color: isCart
                ? cartCount > 0 ? 'var(--green)' : 'var(--muted)'
                : active ? 'var(--green)' : 'var(--muted)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, cursor: 'pointer', fontSize: '.6rem',
              textShadow: (active || (isCart && cartCount > 0)) ? 'var(--led-green)' : 'none',
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
            <span style={{ fontSize: '1.25rem', position: 'relative', display: 'inline-block' }}>
              {tab.icon}
              {isCart && cartCount > 0 && (
                <span className="cart-badge-pop" style={{
                  position: 'absolute', top: -4, right: -6,
                  background: 'linear-gradient(135deg,var(--green),var(--green2))',
                  color: '#000', borderRadius: '50%',
                  width: 17, height: 17, fontSize: '.58rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 8px rgba(61,255,110,.5)',
                }}>
                  {cartCount}
                </span>
              )}
              {tab.id === 'news' && hasUnreadNews && (
                <span style={{
                  position: 'absolute', top: -2, right: -4,
                  width: 9, height: 9, background: '#e83b3b',
                  borderRadius: '50%', border: '1.5px solid rgba(8,12,8,.97)',
                  boxShadow: '0 0 6px rgba(232,59,59,.8)', display: 'block',
                }} />
              )}
            </span>
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
