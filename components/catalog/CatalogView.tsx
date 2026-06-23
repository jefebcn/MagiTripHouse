'use client'
import { useUIStore } from '@/store/uiStore'
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
          {SHIP_TABS.map((t) => {
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

      <SearchBar />
      <CategoryFilter />
      <ProductGrid />
    </>
  )
}
