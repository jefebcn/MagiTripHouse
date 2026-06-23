'use client'
import React from 'react'
import Header from '@/components/layout/Header'
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

const TRUST_CHIPS = [
  { icon: '🔒', label: 'Discreto' },
  { icon: '🚚', label: 'Tutta Europa' },
  { icon: '⭐', label: 'Top quality' },
]

const MEETUP_DEADLINE = new Date('2026-07-01T00:00:00')

export default function HubView() {
  const { goToCatalog, setView, userName } = useUIStore()
  const { products } = useProducts()
  const firstName = (userName || '').trim().split(/\s+/)[0]

  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const msLeft = MEETUP_DEADLINE.getTime() - now.getTime()
  const meetupActive = msLeft > 0
  const daysLeft = Math.max(0, Math.floor(msLeft / 86_400_000))
  const hoursLeft = Math.max(0, Math.floor((msLeft % 86_400_000) / 3_600_000))

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

      {/* Welcome block under logo */}
      <div style={{ textAlign: 'center', padding: '14px 16px 0' }}>
        <div style={{ fontSize: '.92rem', color: 'var(--text)', fontWeight: 600 }}>
          {firstName ? <>Bentornato, <span style={{ color: 'var(--green)' }}>{firstName}</span> 👋</> : <>Benvenuto su Magic Trip House 👋</>}
        </div>
        <div style={{ fontSize: '.72rem', color: 'rgba(106,138,106,.85)', marginTop: 3 }}>
          Premium quality · spedizione discreta in tutta Europa
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 12, flexWrap: 'wrap' }}>
          {TRUST_CHIPS.map((c) => (
            <span key={c.label} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'var(--bg3)', border: '1px solid rgba(61,255,110,.18)',
              borderRadius: 20, padding: '5px 11px',
              fontSize: '.7rem', color: 'var(--muted)', fontWeight: 600,
            }}>
              <span>{c.icon}</span>{c.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14 }} />
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

      {/* Meetup banner */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: meetupActive
            ? 'linear-gradient(135deg, rgba(139,92,246,.18) 0%, var(--card) 70%)'
            : 'linear-gradient(135deg, rgba(80,80,100,.15) 0%, var(--card) 70%)',
          border: meetupActive ? '1.5px solid rgba(139,92,246,.45)' : '1.5px solid rgba(120,120,140,.3)',
          borderRadius: 18, padding: '16px 16px 14px',
          boxShadow: meetupActive ? '0 4px 20px rgba(139,92,246,.15)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>
              {meetupActive ? '🤝' : '😴'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: "'Fredoka One', cursive", fontSize: '1.1rem',
                  color: meetupActive ? '#c084fc' : 'var(--muted)',
                }}>
                  Meetup
                </span>
                {meetupActive && (
                  <span style={{
                    background: 'rgba(139,92,246,.22)', border: '1px solid rgba(139,92,246,.4)',
                    borderRadius: 20, padding: '2px 9px',
                    fontSize: '.64rem', color: '#d8b4fe', fontWeight: 700, letterSpacing: '.3px',
                  }}>
                    DISPONIBILE
                  </span>
                )}
                {!meetupActive && (
                  <span style={{
                    background: 'rgba(100,100,120,.2)', border: '1px solid rgba(120,120,140,.3)',
                    borderRadius: 20, padding: '2px 9px',
                    fontSize: '.64rem', color: 'var(--muted)', fontWeight: 700, letterSpacing: '.3px',
                  }}>
                    SOLO SPEDIZIONE
                  </span>
                )}
              </div>

              {meetupActive ? (
                <>
                  <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
                    Ritiro a mano disponibile · nessun costo di spedizione
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <span style={{ fontSize: '.68rem', color: 'rgba(192,132,252,.8)', fontWeight: 600 }}>
                      ⏳ Termina tra
                    </span>
                    <span style={{
                      background: 'rgba(139,92,246,.25)', border: '1px solid rgba(139,92,246,.35)',
                      borderRadius: 8, padding: '3px 9px',
                      fontSize: '.75rem', color: '#e9d5ff', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                    }}>
                      {daysLeft}g {hoursLeft}h
                    </span>
                    <span style={{ fontSize: '.64rem', color: 'rgba(192,132,252,.6)' }}>
                      (1 luglio)
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 5, lineHeight: 1.4 }}>
                  Il meetup è momentaneamente sospeso.<br />
                  Utilizziamo solo spedizione per questo periodo.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shipping origin cards */}
      <div style={{ padding: '12px 16px 4px' }}>
        <div style={{ fontSize: '.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 700, marginBottom: 2, paddingLeft: 2 }}>
          🚚 Scegli la spedizione
        </div>
        <div style={{ fontSize: '.7rem', color: 'rgba(106,138,106,.7)', marginBottom: 10, paddingLeft: 2, lineHeight: 1.4 }}>
          Ogni spedizione ha il suo carrello e i suoi tempi di consegna.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
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

        {/* Pharma card — full width */}
        {(() => {
          const sm = SHIP_META['pharma']
          const n = countByOrigin('pharma')
          return (
            <button
              onClick={() => goToCatalog({ ship: 'pharma' })}
              style={{
                width: '100%', position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(129,140,248,.14) 0%, var(--card) 65%)',
                border: '1.5px solid rgba(129,140,248,.4)',
                borderRadius: 18, padding: '16px 16px 14px',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 16,
                boxShadow: '0 4px 20px rgba(0,0,0,.3), 0 0 24px rgba(129,140,248,.1)',
              }}
            >
              <div style={{ fontSize: '2.6rem', lineHeight: 1, flexShrink: 0 }}>💊</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.15rem', color: '#818cf8' }}>
                  Pharma EU
                </div>
                <div style={{ fontSize: '.66rem', color: 'var(--muted)', marginTop: 2, lineHeight: 1.35 }}>
                  Deus Medical · Astera Labs · Biaxol
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                  <span style={{ fontSize: '.68rem', color: 'var(--muted)' }}>🚚 {sm.delivery}</span>
                  <span style={{ fontSize: '.68rem', color: 'var(--text)', fontWeight: 600 }}>{n} {n === 1 ? 'prodotto' : 'prodotti'} ›</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, alignItems: 'flex-end' }}>
                <span style={{ fontSize: '.62rem', background: 'rgba(129,140,248,.18)', border: '1px solid rgba(129,140,248,.35)', borderRadius: 20, padding: '3px 8px', color: '#a5b4fc', fontWeight: 700 }}>💉 💊 🧬 🧪 🔄</span>
              </div>
            </button>
          )
        })()}
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
