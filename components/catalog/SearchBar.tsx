'use client'
import { useUIStore } from '@/store/uiStore'

export default function SearchBar() {
  const { search, setSearch } = useUIStore()
  return (
    <div style={{
      margin: '8px 16px', display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '10px 14px',
    }}>
      <span style={{ fontSize: '1rem', opacity: .6 }}>🔍</span>
      <input
        type="text"
        placeholder="Cerca prodotto..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          flex: 1, background: 'none', border: 'none', color: 'var(--text)',
          fontSize: '.9rem', fontFamily: 'inherit', outline: 'none',
        }}
      />
      {search && (
        <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '.85rem' }}>
          ✕
        </button>
      )}
    </div>
  )
}
