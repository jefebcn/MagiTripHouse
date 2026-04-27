'use client'
import React from 'react'
import { useUIStore } from '@/store/uiStore'

export default function SearchBar() {
  const { search, setSearch } = useUIStore()
  const [focused, setFocused] = React.useState(false)
  return (
    <div style={{
      margin: '8px 16px 14px', display: 'flex', alignItems: 'center', gap: 10,
      background: focused ? 'rgba(61,255,110,.04)' : 'var(--bg3)',
      border: `1.5px solid ${focused ? 'rgba(61,255,110,.4)' : 'var(--border)'}`,
      borderRadius: 14,
      padding: '10px 14px',
      transition: '.18s',
      boxShadow: focused ? '0 0 16px rgba(61,255,110,.1)' : 'none',
    }}>
      <span style={{ fontSize: '.95rem', opacity: focused ? .9 : .5, transition: '.18s', color: 'var(--green)' }}>🔍</span>
      <input
        type="text"
        placeholder="Cerca prodotto..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1, background: 'none', border: 'none', color: 'var(--text)',
          fontSize: '.88rem', fontFamily: 'inherit', outline: 'none',
        }}
      />
      {search && (
        <button onClick={() => setSearch('')} style={{
          background: 'rgba(106,138,106,.2)', border: 'none', color: 'var(--muted)',
          cursor: 'pointer', fontSize: '.75rem', borderRadius: '50%',
          width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          ✕
        </button>
      )}
    </div>
  )
}
