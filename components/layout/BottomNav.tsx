'use client'
import { useUIStore } from '@/store/uiStore'
import { useCartStore } from '@/store/cartStore'

const TABS = [
  { id: 'offers',  label: 'Offerte',  icon: '🔥' },
  { id: 'catalog', label: 'Catalogo', icon: '🛍️' },
  { id: 'hub',     label: 'Home',     icon: '🏠' },
  { id: 'cart',    label: 'Carrello', icon: '🛒' },
  { id: 'account', label: 'Account',  icon: '👤' },
] as const

export default function BottomNav() {
  const { view, setView, setCartOpen } = useUIStore()
  const items = useCartStore((s) => s.items)
  const cartCount = items.reduce((sum, x) => sum + x.qty, 0)

  return (
    <nav
      style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)', zIndex: 100,
        bottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        width: 'calc(100% - 20px)', maxWidth: 460,
        background: 'rgba(12,17,12,.88)', backdropFilter: 'blur(18px) saturate(140%)', WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        border: '1px solid rgba(255,255,255,.07)', borderRadius: 24,
        display: 'flex', alignItems: 'flex-end', padding: '6px 6px',
        boxShadow: '0 10px 30px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.05)',
      }}
    >
      {TABS.map((tab) => {
        const isCart = tab.id === 'cart'
        const isCenter = tab.id === 'hub'
        const active = !isCart && view === tab.id
        const onClick = () => isCart ? setCartOpen(true) : setView(tab.id as Parameters<typeof setView>[0])

        if (isCenter) {
          return (
            <button key={tab.id} onClick={onClick} aria-label={tab.label} style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: 0,
            }}>
              <span className={active ? 'home-glow' : undefined} style={{
                width: 58, height: 58, marginTop: -26, borderRadius: 20, fontSize: '1.65rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active
                  ? 'linear-gradient(145deg, #5dff86 0%, var(--green) 45%, var(--green2) 100%)'
                  : 'linear-gradient(145deg, #1d3a22 0%, #13261a 100%)',
                border: '3px solid var(--bg)',
                boxShadow: active
                  ? '0 0 0 2px rgba(61,255,110,.45), 0 8px 24px rgba(61,255,110,.45)'
                  : '0 0 0 1px rgba(61,255,110,.35), 0 8px 20px rgba(0,0,0,.5)',
                transform: active ? 'translateY(-2px)' : 'none', transition: '.2s',
              }}>{tab.icon}</span>
              <span style={{ fontSize: '.62rem', fontWeight: 800, color: 'var(--green)', paddingBottom: 3 }}>{tab.label}</span>
            </button>
          )
        }

        const lit = active || (isCart && cartCount > 0)
        return (
          <button
            key={tab.id}
            onClick={onClick}
            style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0 3px',
              color: lit ? 'var(--green)' : 'var(--muted)', fontSize: '.6rem', fontWeight: active ? 700 : 500,
              transition: '.2s',
            }}
          >
            <span style={{
              position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 44, height: 30, borderRadius: 12, fontSize: '1.15rem',
              background: active ? 'rgba(61,255,110,.14)' : 'transparent', transition: '.2s',
              filter: lit ? 'none' : 'grayscale(.35)', opacity: lit ? 1 : .85,
            }}>
              {tab.icon}
              {isCart && cartCount > 0 && (
                <span className="cart-badge-pop" style={{
                  position: 'absolute', top: -3, right: 2,
                  background: 'linear-gradient(135deg,var(--green),var(--green2))',
                  color: '#000', borderRadius: 9, minWidth: 17, height: 17, padding: '0 4px',
                  fontSize: '.58rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 8px rgba(61,255,110,.5)',
                }}>{cartCount}</span>
              )}
            </span>
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
