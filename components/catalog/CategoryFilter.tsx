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
      display: 'flex', gap: 7, overflowX: 'auto', padding: '14px 16px 6px',
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
              padding: '8px 16px', borderRadius: 24, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '.8rem', fontWeight: active ? 700 : 500,
              transition: '.18s',
              background: active
                ? 'linear-gradient(135deg,rgba(61,255,110,.22),rgba(61,255,110,.1))'
                : 'var(--bg3)',
              color: active ? 'var(--green)' : 'var(--muted)',
              outline: 'none',
              border: `1.5px solid ${active ? 'rgba(61,255,110,.55)' : 'var(--border)'}`,
              boxShadow: active
                ? '0 0 14px rgba(61,255,110,.22), inset 0 0 8px rgba(61,255,110,.05)'
                : 'none',
              whiteSpace: 'nowrap',
              letterSpacing: active ? '.2px' : '0',
            }}
          >
            {cat.label}
          </button>
        )
      })}
    </div>
  )
}
