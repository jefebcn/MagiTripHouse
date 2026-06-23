'use client'
import { useUIStore } from '@/store/uiStore'

const CANNABIS_CATS = [
  { id: 'all',     label: '🔥 Tutti' },
  { id: 'premium', label: '💎 Premium' },
  { id: 'frozen',  label: '🧊 Frozen' },
  { id: 'new',     label: '✨ Novità' },
  { id: 'hash',    label: '🪨 Hash' },
  { id: 'cbd',     label: '🌿 THC' },
  { id: 'combo',   label: '🔥 Combo' },
]

const PHARMA_CATS = [
  { id: 'all',        label: '🔥 Tutti' },
  { id: 'injectable', label: '💉 Iniettabili' },
  { id: 'oral',       label: '💊 Orali' },
  { id: 'sarms',      label: '🧬 SARMs' },
  { id: 'peptides',   label: '🧪 Peptidi' },
  { id: 'pct',        label: '🔄 PCT' },
]

export default function CategoryFilter() {
  const { filter, setFilter, shipFilter } = useUIStore()
  const CATEGORIES = shipFilter === 'pharma' ? PHARMA_CATS : CANNABIS_CATS
  return (
    <div style={{
      display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 16px 4px',
      scrollbarWidth: 'none',
    }}>
      {CATEGORIES.map((cat) => {
        const active = filter === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            style={{
              flexShrink: 0,
              padding: '9px 18px', borderRadius: 24, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '.82rem', fontWeight: active ? 700 : 500,
              transition: '.18s',
              background: active
                ? 'linear-gradient(135deg,rgba(61,255,110,.25),rgba(61,255,110,.12))'
                : 'var(--bg3)',
              color: active ? 'var(--green)' : 'var(--muted)',
              outline: 'none',
              border: `1.5px solid ${active ? 'rgba(61,255,110,.6)' : 'var(--border)'}`,
              boxShadow: active
                ? '0 0 18px rgba(61,255,110,.25), inset 0 0 8px rgba(61,255,110,.06)'
                : 'none',
              whiteSpace: 'nowrap',
              letterSpacing: active ? '.2px' : '0',
              transform: active ? 'translateY(-1px)' : 'none',
            }}
          >
            {cat.label}
          </button>
        )
      })}
    </div>
  )
}
