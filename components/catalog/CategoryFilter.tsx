'use client'
import { useUIStore } from '@/store/uiStore'

const CATEGORIES = [
  { id: 'all',     label: '🔥 Tutti' },
  { id: 'premium', label: '💎 Premium' },
  { id: 'frozen',  label: '🧊 Frozen' },
  { id: 'new',     label: '✨ Novità' },
  { id: 'hash',    label: '🪨 Hash' },
  { id: 'cbd',     label: '🌿 CBD' },
]

export default function CategoryFilter() {
  const { filter, setFilter } = useUIStore()
  return (
    <div style={{
      display: 'flex', gap: 8, overflowX: 'auto', padding: '18px 16px 8px',
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
              padding: '7px 14px', borderRadius: 20, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '.78rem', fontWeight: 600, transition: '.2s',
              background: active ? 'rgba(61,255,110,.15)' : 'var(--bg3)',
              color: active ? 'var(--green)' : 'var(--muted)',
              outline: 'none',
              border: `1px solid ${active ? 'rgba(61,255,110,.4)' : 'var(--border)'}`,
              boxShadow: active ? '0 0 10px rgba(61,255,110,.15)' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {cat.label}
          </button>
        )
      })}
    </div>
  )
}
