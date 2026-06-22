'use client'
import React from 'react'
import Header from '@/components/layout/Header'
import AnnouncementBanner from '@/components/layout/AnnouncementBanner'
import Marquee from '@/components/layout/Marquee'
import { useUIStore } from '@/store/uiStore'
import { useProducts } from '@/hooks/useProducts'
import { SHIP_META, type ShipOrigin } from '@/store/cartStore'

const SHIP_DESC: Record<ShipOrigin, string> = {
  spain: 'Catalogo completo · Cali, Hash, Frozen',
  italy: 'Spedizione rapida dall’Italia',
}

const CATEGORY_SHORTCUTS = [
  { id: 'premium', label: 'Premium', emoji: '💎' },
  { id: 'frozen',  label: 'Frozen',  emoji: '🧊' },
  { id: 'hash',    label: 'Hash',    emoji: '🪨' },
  { id: 'cbd',     label: 'THC',     emoji: '🌿' },
  { id: 'new',     label: 'Novità',  emoji: '✨' },
  { id: 'combo',   label: 'Combo',   emoji: '🔥' },
]

export default function HubView() {
  const { goToCatalog, setView } = useUIStore()
  const { products } = useProducts()

  const countByOrigin = (o: ShipOrigin) =>
    products.filter(p => (p.shipFrom ?? 'spain') === o && p.category !== 'request').length

  return (
    <div style={{ paddingBottom: 110 }}>
      {/* Tombola banner */}
      <a
        href="https://t.me/+hHYTnDvbiYgwYjY0"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '7px 16px', textDecoration: 'none',
          background: 'linear-gradient(90deg,#6b2700 0%,#b84800 30%,#e09000 50%,#b84800 70%,#6b2700 100%)',
          borderBottom: '1px solid rgba(255,160,0,.25)',
          boxShadow: '0 2px 12px rgba(200,100,0,.18)',
        }}
      >
        <span style={{ fontSize: '1rem', flexShrink: 0, display: 'inline-block', animation: 'tombola-pulse 2s ease-in-out infinite' }}>🎰</span>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.78rem', color: '#fff3cc', letterSpacing: '.5px', textShadow: '0 1px 6px rgba(0,0,0,.5)', whiteSpace: 'nowrap' }}>
          PARTECIPA ALLA TOMBOLA — Clicca qui!
        </span>
        <span style={{ fontSize: '1rem', flexShrink: 0, display: 'inline-block', animation: 'tombola-pulse 2s ease-in-out infinite .5s' }}>🎟️</span>
      </a>
      <Header />
      <AnnouncementBanner />
      <Marquee />

      {/* Search — tap to enter catalog */}
      <div style={{ padding: '14px 16px 4px' }}>
        <button
          onClick={() => goToCatalog({ ship: null })}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg3)', border: '1.5px solid var(--border)',
            borderRadius: 16, padding: '14px 16px', cursor: 'pointer',
            fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '1.05rem', color: 'var(--green)' }}>🔍</span>
          <span style={{ flex: 1, color: 'var(--muted)', fontSize: '.92rem' }}>Cerca un prodotto…</span>
          <span style={{ fontSize: '.85rem', color: 'var(--muted)' }}>›</span>
        </button>
      </div>

      {/* Shipping origin cards */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{ fontSize: '.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 700, marginBottom: 2, paddingLeft: 2 }}>
          🚚 Scegli la spedizione
        </div>
        <div style={{ fontSize: '.7rem', color: 'rgba(106,138,106,.7)', marginBottom: 10, paddingLeft: 2, lineHeight: 1.4 }}>
          Ogni spedizione ha il suo carrello e i suoi tempi di consegna.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {(['spain', 'italy'] as ShipOrigin[]).map((o) => {
            const sm = SHIP_META[o]
            const n = countByOrigin(o)
            return (
              <button
                key={o}
                onClick={() => goToCatalog({ ship: o })}
                style={{
                  position: 'relative', overflow: 'hidden',
                  background: `linear-gradient(160deg, ${sm.color}1f 0%, var(--card) 65%)`,
                  border: `1.5px solid ${sm.color}55`,
                  borderRadius: 18, padding: '18px 14px 16px',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: 6,
                  boxShadow: `0 4px 20px rgba(0,0,0,.3), 0 0 24px ${sm.color}14`,
                }}
              >
                <div style={{ fontSize: '2.4rem', lineHeight: 1 }}>{sm.flag}</div>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.2rem', color: sm.color }}>{sm.label}</div>
                <div style={{ fontSize: '.66rem', color: 'var(--muted)', lineHeight: 1.35 }}>{SHIP_DESC[o]}</div>
                <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>🚚 {sm.delivery}</div>
                <div style={{ fontSize: '.68rem', color: 'var(--text)', fontWeight: 600, marginTop: 2 }}>
                  {n} {n === 1 ? 'prodotto' : 'prodotti'} ›
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Category shortcuts */}
      <div style={{ padding: '18px 16px 4px' }}>
        <div style={{ fontSize: '.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 700, marginBottom: 10, paddingLeft: 2 }}>
          🗂️ Categorie
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {CATEGORY_SHORTCUTS.map((c) => (
            <button
              key={c.id}
              onClick={() => goToCatalog({ ship: null, category: c.id })}
              style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '14px 8px', cursor: 'pointer',
                fontFamily: 'inherit', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{c.emoji}</span>
              <span style={{ fontSize: '.74rem', color: 'var(--text)', fontWeight: 600 }}>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div style={{ padding: '18px 16px 4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => setView('request')}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'linear-gradient(135deg, rgba(59,130,246,.1), var(--card))',
            border: '1px solid rgba(59,130,246,.3)', borderRadius: 14,
            padding: '14px 16px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>📦</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--text)' }}>Su Richiesta</div>
            <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>Ordina prodotti non in catalogo</div>
          </div>
          <span style={{ color: 'var(--muted)' }}>›</span>
        </button>

        <button
          onClick={() => setView('affiliates')}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'linear-gradient(135deg, rgba(245,200,66,.1), var(--card))',
            border: '1px solid rgba(245,200,66,.3)', borderRadius: 14,
            padding: '14px 16px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>🤝</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--text)' }}>Programma Affiliati</div>
            <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>Invita amici e guadagna credito</div>
          </div>
          <span style={{ color: 'var(--muted)' }}>›</span>
        </button>
      </div>
    </div>
  )
}
