'use client'
import { useUIStore } from '@/store/uiStore'
import { useProducts } from '@/hooks/useProducts'
import { SHIP_META, type ShipOrigin } from '@/store/cartStore'
import CategoryFilter from './CategoryFilter'
import SearchBar from './SearchBar'
import ProductGrid from './ProductGrid'

const SHIP_TABS: { id: ShipOrigin | null; label: string }[] = [
  { id: null,     label: '🌍 Tutti' },
  { id: 'spain',  label: '🇪🇸 Spagna' },
  { id: 'italy',  label: '🇮🇹 Italia' },
  { id: 'pharma', label: '💊 Pharma' },
]

export default function CatalogView() {
  const { shipFilter, setShipFilter, setView } = useUIStore()
  const { products } = useProducts()

  // Tab "In loco" mostrata solo se ci sono prodotti meetup
  const hasMeetup = products.some(p => p.shipFrom === 'meetup' && p.category !== 'request')
  const tabs = hasMeetup
    ? [...SHIP_TABS, { id: 'meetup' as ShipOrigin, label: '🤝 In loco' }]
    : SHIP_TABS

  return (
    <>
      {/* Top bar: back + ship toggle */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(8,12,8,.96)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(61,255,110,.1)',
        padding: '10px 12px 10px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button
          onClick={() => setView('hub')}
          aria-label="Torna alla home"
          style={{
            flexShrink: 0, background: 'var(--bg3)', border: '1px solid var(--border)',
            color: 'var(--text)', borderRadius: 10, width: 36, height: 36,
            cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >‹</button>

        <div style={{ display: 'flex', gap: 6, flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {tabs.map((t) => {
            const active = shipFilter === t.id
            const color = t.id ? SHIP_META[t.id].color : 'var(--green)'
            return (
              <button
                key={String(t.id)}
                onClick={() => setShipFilter(t.id)}
                style={{
                  flexShrink: 0, borderRadius: 22, padding: '8px 16px', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '.8rem', fontWeight: active ? 700 : 500,
                  background: active ? `${color}22` : 'var(--bg3)',
                  color: active ? color : 'var(--muted)',
                  border: `1.5px solid ${active ? `${color}88` : 'var(--border)'}`,
                  whiteSpace: 'nowrap', transition: '.15s',
                }}
              >{t.label}</button>
            )
          })}
        </div>
      </div>

      {/* Banner "in loco" — visibile sempre quando ci sono prodotti meetup */}
      {hasMeetup && shipFilter !== 'meetup' && (() => {
        const n = products.filter(p => p.shipFrom === 'meetup' && p.category !== 'request').length
        return (
          <button
            onClick={() => setShipFilter('meetup')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '10px 16px',
              background: 'linear-gradient(90deg, rgba(192,132,252,.14) 0%, rgba(192,132,252,.06) 100%)',
              border: 'none', borderBottom: '1px solid rgba(192,132,252,.22)',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🤝</span>
            <span style={{ flex: 1, fontSize: '.78rem', fontWeight: 700, color: '#d8b4fe' }}>
              {n} prodott{n === 1 ? 'o' : 'i'} disponibil{n === 1 ? 'e' : 'i'} in loco
            </span>
            <span style={{
              fontSize: '.65rem', fontWeight: 700, color: '#c084fc',
              background: 'rgba(192,132,252,.18)', border: '1px solid rgba(192,132,252,.35)',
              borderRadius: 20, padding: '2px 9px', flexShrink: 0,
            }}>Vedi →</span>
          </button>
        )
      })()}

      <SearchBar />
      <CategoryFilter />
      <ProductGrid />
    </>
  )
}
