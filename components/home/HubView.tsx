'use client'
import React from 'react'
import Header from '@/components/layout/Header'
import Marquee from '@/components/layout/Marquee'
import { useUIStore } from '@/store/uiStore'
import { useProducts } from '@/hooks/useProducts'
import { SHIP_META, type ShipOrigin } from '@/store/cartStore'

const SHIP_DESC: Partial<Record<ShipOrigin, string>> = {
  spain: 'Cali · Hash · Frozen · Premium',
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
  const daysLeft  = Math.max(0, Math.floor(msLeft / 86_400_000))
  const hoursLeft = Math.max(0, Math.floor((msLeft % 86_400_000) / 3_600_000))

  const countByOrigin = (o: ShipOrigin) =>
    products.filter(p => (p.shipFrom ?? 'spain') === o && p.category !== 'request').length

  return (
    <div style={{ paddingBottom: 110 }}>

      {/* ═══════════ HERO ═══════════ */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Disco glow concentrato dietro il logo */}
        <div style={{
          position: 'absolute', top: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: 340, height: 200,
          background: 'radial-gradient(ellipse, rgba(61,255,110,.22) 0%, rgba(61,255,110,.06) 45%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Header />
        </div>

        {/* Greeting */}
        <div style={{ textAlign: 'center', padding: '6px 24px 20px', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '.15px', lineHeight: 1.4 }}>
            {firstName
              ? <>Bentornato, <span style={{ color: 'var(--green)', textShadow: '0 0 14px rgba(61,255,110,.55)' }}>{firstName}</span> 👋</>
              : <>Benvenuto su <span style={{ color: 'var(--green)', textShadow: '0 0 14px rgba(61,255,110,.55)' }}>Magic Trip House</span> 👋</>
            }
          </div>
          <div style={{ fontSize: '.73rem', color: 'rgba(106,138,106,.8)', marginTop: 4, letterSpacing: '.3px' }}>
            Premium quality · spedizione discreta · tutta Europa
          </div>

          {/* Trust chips */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
            {TRUST_CHIPS.map(c => (
              <span key={c.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(61,255,110,.07)',
                border: '1px solid rgba(61,255,110,.2)',
                borderRadius: 20, padding: '5px 13px',
                fontSize: '.7rem', color: 'rgba(237,250,238,.72)', fontWeight: 600,
              }}>
                <span>{c.icon}</span>{c.label}
              </span>
            ))}
          </div>

          {/* Link "Come funziona" */}
          <button
            onClick={() => setView('faq')}
            style={{
              marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: '.74rem', color: 'rgba(245,200,66,.85)',
              fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >❓ Come funziona? Pagamento, spedizioni e tracking</button>
        </div>

        {/* Separatore sfumato */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(61,255,110,.18) 30%, rgba(61,255,110,.18) 70%, transparent)', margin: '0 24px' }} />
      </div>

      {/* ═══════════ MARQUEE ═══════════ */}
      <div style={{ marginTop: 14 }}>
        <Marquee />
      </div>

      {/* ═══════════ SEARCH ═══════════ */}
      <div style={{ padding: '16px 16px 0' }}>
        <button
          onClick={() => goToCatalog({ ship: null })}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(61,255,110,.05)',
            border: '1.5px solid rgba(61,255,110,.2)',
            borderRadius: 16, padding: '14px 18px',
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            boxShadow: '0 0 0 0 rgba(61,255,110,0)',
            transition: 'box-shadow .2s, border-color .2s',
          }}
        >
          <span style={{ fontSize: '1.1rem', color: 'var(--green)', opacity: .9 }}>🔍</span>
          <span style={{ flex: 1, color: 'rgba(106,138,106,.8)', fontSize: '.92rem' }}>Cerca un prodotto…</span>
          <span style={{ fontSize: '.82rem', color: 'rgba(61,255,110,.5)', fontWeight: 700 }}>›</span>
        </button>
      </div>

      {/* ═══════════ SEZIONE CATALOGO ═══════════ */}
      <div style={{ padding: '22px 16px 0' }}>

        {/* Label sezione */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 3, height: 16, background: 'var(--green)', borderRadius: 2, boxShadow: 'var(--led-green)' }} />
          <span style={{ fontSize: '.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontWeight: 700 }}>
            Entra nel catalogo
          </span>
        </div>

        {/* Spain + Italy cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {(['spain', 'italy'] as ShipOrigin[]).map((o) => {
            const sm = SHIP_META[o]
            const n  = countByOrigin(o)
            return (
              <button
                key={o}
                onClick={() => goToCatalog({ ship: o })}
                style={{
                  position: 'relative', overflow: 'hidden',
                  background: `linear-gradient(150deg, ${sm.color}18 0%, var(--card) 60%)`,
                  border: `1.5px solid ${sm.color}44`,
                  borderRadius: 20, padding: '20px 14px 18px',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: 5,
                  boxShadow: `0 6px 24px rgba(0,0,0,.35), 0 0 28px ${sm.color}12`,
                  minHeight: 150,
                }}
              >
                {/* Cerchio decorativo sfondo */}
                <div style={{
                  position: 'absolute', right: -28, top: -28,
                  width: 110, height: 110, borderRadius: '50%',
                  background: `radial-gradient(circle, ${sm.color}22 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />

                <div style={{ fontSize: '2.8rem', lineHeight: 1 }}>{sm.flag}</div>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.25rem', color: sm.color, letterSpacing: '.3px' }}>
                  {sm.label}
                </div>
                <div style={{ fontSize: '.65rem', color: 'rgba(106,138,106,.75)', lineHeight: 1.4 }}>
                  {SHIP_DESC[o]}
                </div>
                <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: 2 }}>🚚 {sm.delivery}</div>
                <div style={{ fontSize: '.64rem', color: 'rgba(245,200,66,.8)', marginTop: 1 }}>📅 Spedizioni Lun–Mer</div>
                <div style={{ marginTop: 6 }}>
                  <span style={{
                    display: 'inline-block',
                    background: `${sm.color}18`, border: `1px solid ${sm.color}40`,
                    borderRadius: 20, padding: '3px 10px',
                    fontSize: '.66rem', color: sm.color, fontWeight: 700,
                  }}>
                    {n} prodott{n === 1 ? 'o' : 'i'} ›
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Pharma card — full width */}
        {(() => {
          const sm = SHIP_META['pharma']
          const n  = countByOrigin('pharma')
          return (
            <button
              onClick={() => goToCatalog({ ship: 'pharma' })}
              style={{
                width: '100%', position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(129,140,248,.10) 0%, var(--card) 60%)',
                border: '1px solid rgba(129,140,248,.26)',
                borderRadius: 16, padding: '12px 14px',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 14,
                boxShadow: '0 4px 16px rgba(0,0,0,.25)',
              }}
            >
              <div style={{
                position: 'absolute', right: -30, top: -30,
                width: 130, height: 130, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(129,140,248,.18) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              <div style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>💊</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.05rem', color: '#818cf8' }}>Pharma EU</span>
                  <span style={{ fontSize: '.62rem', color: 'var(--muted)' }}>· {n} prodotti</span>
                </div>
                <div style={{ fontSize: '.63rem', color: 'rgba(106,138,106,.7)', marginTop: 2 }}>
                  Deus Medical · Astera Labs · Biaxol · 🚚 {sm.delivery}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                {['💉','💊','🧬','🧪','🔄'].map(e => (
                  <span key={e} style={{ fontSize: '.85rem' }}>{e}</span>
                ))}
              </div>
            </button>
          )
        })()}
      </div>

      {/* ═══════════ CATEGORIE (scroll orizzontale) ═══════════ */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', marginBottom: 12 }}>
          <div style={{ width: 3, height: 16, background: 'var(--gold)', borderRadius: 2, boxShadow: 'var(--led-gold)' }} />
          <span style={{ fontSize: '.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontWeight: 700 }}>
            Sfoglia categoria
          </span>
        </div>
        <div style={{ display: 'flex', gap: 9, overflowX: 'auto', padding: '0 16px 4px', scrollbarWidth: 'none' }}>
          {CATEGORY_SHORTCUTS.map(c => (
            <button
              key={c.id}
              onClick={() => goToCatalog({ ship: null, category: c.id })}
              style={{
                flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '14px 12px', cursor: 'pointer',
                fontFamily: 'inherit', minWidth: 66,
                transition: 'border-color .15s, background .15s',
              }}
            >
              <span style={{ fontSize: '1.65rem' }}>{c.emoji}</span>
              <span style={{ fontSize: '.7rem', color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════ MEETUP — banda compatta ═══════════ */}
      <div style={{ margin: '20px 16px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', borderRadius: 14,
          background: meetupActive ? 'rgba(139,92,246,.07)' : 'rgba(60,60,80,.06)',
          border: meetupActive ? '1px solid rgba(139,92,246,.22)' : '1px solid rgba(100,100,130,.15)',
        }}>
          <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{meetupActive ? '🤝' : '😴'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '.82rem', fontWeight: 700, color: meetupActive ? '#c084fc' : 'var(--muted)' }}>
              Meetup{!meetupActive ? ' sospeso' : ''}
            </span>
            {meetupActive
              ? <span style={{ fontSize: '.69rem', color: 'var(--muted)', marginLeft: 8 }}>ritiro a mano · {daysLeft}g {hoursLeft}h rimasti</span>
              : <span style={{ fontSize: '.69rem', color: 'var(--muted)', marginLeft: 8 }}>solo spedizione per questo periodo</span>
            }
          </div>
          {meetupActive && (
            <span style={{
              background: 'rgba(139,92,246,.2)', border: '1px solid rgba(139,92,246,.32)',
              borderRadius: 20, padding: '3px 9px',
              fontSize: '.62rem', color: '#d8b4fe', fontWeight: 700, flexShrink: 0,
            }}>LIVE</span>
          )}
        </div>

        {/* Card prodotti disponibili in loco — solo se esistono */}
        {countByOrigin('meetup') > 0 && (
          <button
            onClick={() => goToCatalog({ ship: 'meetup' })}
            style={{
              width: '100%', marginTop: 10, position: 'relative', overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(192,132,252,.12) 0%, var(--card) 60%)',
              border: '1px solid rgba(192,132,252,.3)',
              borderRadius: 14, padding: '11px 14px',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{
              position: 'absolute', right: -28, top: -28,
              width: 110, height: 110, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(192,132,252,.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🤝</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.95rem', color: '#d8b4fe' }}>
                Disponibili in loco
              </div>
              <div style={{ fontSize: '.63rem', color: 'rgba(216,180,254,.7)', marginTop: 1 }}>
                {countByOrigin('meetup')} prodott{countByOrigin('meetup') === 1 ? 'o' : 'i'} · solo ritiro a mano
              </div>
            </div>
            <span style={{ fontSize: '.82rem', color: 'rgba(192,132,252,.6)', fontWeight: 700, flexShrink: 0 }}>›</span>
          </button>
        )}
      </div>

      {/* ═══════════ QUICK LINKS ═══════════ */}
      <div style={{ margin: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => setView('affiliates')}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(245,200,66,.06)', border: '1px solid rgba(245,200,66,.2)',
            borderRadius: 14, padding: '13px 16px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>🤝</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--text)' }}>Programma Affiliati</div>
            <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: 1 }}>Invita amici e guadagna credito</div>
          </div>
          <span style={{ fontSize: '.82rem', color: 'rgba(245,200,66,.5)', fontWeight: 700 }}>›</span>
        </button>
      </div>

    </div>
  )
}
