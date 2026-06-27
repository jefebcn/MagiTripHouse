'use client'
import React from 'react'
import Image from 'next/image'
import type { Product } from '@/hooks/useProducts'
import { useUIStore } from '@/store/uiStore'
import { SHIP_META, type ShipOrigin } from '@/store/cartStore'

const BADGE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  premium: { bg: 'rgba(245,200,66,.15)', color: '#f5c842', border: 'rgba(245,200,66,.45)' },
  frozen:  { bg: 'rgba(59,130,246,.15)', color: '#7ec8f8', border: 'rgba(59,130,246,.45)' },
  new:     { bg: 'rgba(61,255,110,.15)', color: '#3dff6e', border: 'rgba(61,255,110,.45)' },
  hash:    { bg: 'rgba(200,140,60,.15)', color: '#e0a060', border: 'rgba(200,140,60,.45)' },
  cbd:     { bg: 'rgba(61,255,110,.12)', color: '#a0e8b0', border: 'rgba(61,255,110,.35)' },
  combo:   { bg: 'rgba(255,120,0,.18)', color: '#ff8c00', border: 'rgba(255,120,0,.5)' },
}

const BADGE_LABELS: Record<string, string> = {
  premium: '💎 Premium',
  frozen:  '🧊 Frozen',
  new:     '✨ Novità',
  hash:    '🪨 Hash',
  cbd:     '🌿 THC',
  combo:   '🔥 Combo',
}

function getMinPrice(p: Product): number {
  if (p.variants?.length) return Math.min(...p.variants.map((v) => v.price))
  return 0
}

interface Props { product: Product; index: number }

export default function ProductCard({ product: p, index }: Props) {
  const { setDetailProduct } = useUIStore()
  const [pressed, setPressed] = React.useState(false)
  const minPrice = getMinPrice(p)
  const isExhausted  = p.stock === 0
  const isComingSoon = p.isComingSoon
  const isOnSale     = p.isOnSale && !isExhausted && !isComingSoon
  const badgeStyle   = p.badge ? (BADGE_COLORS[p.badge] ?? { bg: 'rgba(0,0,0,.7)', color: '#fff', border: 'rgba(255,255,255,.2)' }) : null
  const unavailable  = isExhausted || isComingSoon

  return (
    <div
      onClick={() => !unavailable && setDetailProduct(p)}
      onPointerDown={() => !unavailable && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        background: p.category === 'combo' ? 'linear-gradient(160deg,rgba(255,100,0,.08) 0%,var(--card) 70%)' : 'var(--card)',
        border: p.category === 'combo' ? '1px solid rgba(255,120,0,.4)' : '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        cursor: unavailable ? 'default' : 'pointer',
        transition: 'transform .15s, box-shadow .15s',
        willChange: 'transform',
        animation: `fadeInUp .35s ease both`,
        animationDelay: `${index * 0.05}s`,
        transform: pressed ? 'scale(.97)' : 'scale(1)',
        boxShadow: pressed
          ? '0 1px 6px rgba(0,0,0,.3)'
          : p.category === 'combo'
            ? '0 2px 12px rgba(0,0,0,.35), 0 0 18px rgba(255,100,0,.1)'
            : '0 2px 12px rgba(0,0,0,.35)',
      }}
    >
      {/* ── COMBO LAYOUT (no media) ── */}
      {p.category === 'combo' ? (
        <div style={{ padding: '14px 13px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Badge + title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              background: 'rgba(255,120,0,.18)', border: '1px solid rgba(255,120,0,.5)',
              borderRadius: 20, padding: '3px 10px',
              fontSize: '.6rem', fontWeight: 700, color: '#ff8c00', letterSpacing: '.3px', flexShrink: 0,
            }}>🔥 Combo</div>
            {isOnSale && (
              <div style={{
                background: 'rgba(232,59,59,.88)', border: '1px solid rgba(232,59,59,.5)',
                borderRadius: 20, padding: '3px 9px',
                fontSize: '.6rem', fontWeight: 800, color: '#fff', letterSpacing: '1px',
              }}>SCONTO</div>
            )}
          </div>

          {/* Name */}
          <div style={{
            fontFamily: "'Fredoka One', cursive", fontSize: '1rem',
            letterSpacing: '.2px', lineHeight: 1.2,
            color: unavailable ? 'var(--muted)' : 'var(--text)',
          }}>{p.name}</div>

          {/* Bundle items */}
          {p.bundleItems && p.bundleItems.length > 0 && (
            <div style={{
              background: 'rgba(255,120,0,.06)', border: '1px solid rgba(255,120,0,.22)',
              borderRadius: 10, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5,
            }}>
              {p.bundleItems.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: '1rem' }}>{b.emoji}</span>
                  <span style={{ fontSize: '.78rem', color: '#ffaa44', fontWeight: 600 }}>
                    {b.qty}× {b.productName}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Price + button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 2 }}>
            {isComingSoon ? (
              <div style={{ fontSize: '.75rem', color: '#7ec8f8', fontWeight: 700 }}>Prossimamente</div>
            ) : isExhausted ? (
              <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>Non disponibile</div>
            ) : minPrice > 0 ? (
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.18rem', color: 'var(--green)', textShadow: 'var(--led-green)' }}>
                da €{minPrice}
              </div>
            ) : (
              <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>Vedi tagli</div>
            )}
            {!unavailable && (
              <button
                onClick={(e) => { e.stopPropagation(); setDetailProduct(p) }}
                style={{
                  background: 'linear-gradient(135deg,var(--green),var(--green2))',
                  border: 'none', borderRadius: 8, padding: '6px 14px',
                  fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', color: '#000',
                  fontFamily: "'Fredoka One', cursive", letterSpacing: '.3px',
                  boxShadow: '0 2px 8px rgba(61,255,110,.25)', flexShrink: 0,
                }}
              >Scegli</button>
            )}
          </div>
        </div>
      ) : (
      /* ── NORMAL LAYOUT (with media) ── */
      <>
      {/* Media */}
      <div style={{ position: 'relative', paddingBottom: '96%', background: 'var(--bg3)' }}>
        {p.imageUrl ? (
          p.mediaType === 'video' ? (
            <video
              src={p.imageUrl}
              autoPlay muted loop playsInline
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                filter: isExhausted ? 'grayscale(0.9) brightness(0.45)' : isComingSoon ? 'brightness(0.55)' : 'none' }}
            />
          ) : (
            <Image
              src={p.imageUrl}
              alt={p.name}
              fill
              style={{ objectFit: 'cover',
                filter: isExhausted ? 'grayscale(0.9) brightness(0.45)' : isComingSoon ? 'brightness(0.55)' : 'none' }}
              sizes="(max-width: 480px) 50vw, 240px"
            />
          )
        ) : (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '2.8rem',
            background: 'radial-gradient(ellipse at center, rgba(61,255,110,.04) 0%, transparent 70%)',
            opacity: unavailable ? 0.4 : 1,
          }}>
            {p.emoji}
          </div>
        )}

        {/* Gradient overlay bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%',
          background: 'linear-gradient(transparent, rgba(0,0,0,.55))',
          pointerEvents: 'none',
        }} />

        {/* Category badge — top left */}
        {p.badge && !unavailable && badgeStyle && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            background: badgeStyle.bg, backdropFilter: 'blur(8px)',
            border: `1px solid ${badgeStyle.border}`,
            borderRadius: 20, padding: '3px 9px',
            fontSize: '.6rem', fontWeight: 700, color: badgeStyle.color, letterSpacing: '.3px',
          }}>
            {BADGE_LABELS[p.badge] ?? p.badge}
          </div>
        )}

        {/* SCONTO badge — top right */}
        {isOnSale && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(232,59,59,.88)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(232,59,59,.5)',
            borderRadius: 20, padding: '3px 9px',
            fontSize: '.6rem', fontWeight: 800, color: '#fff', letterSpacing: '1px',
          }}>SCONTO</div>
        )}

        {/* Delivery mode badge — bottom left */}
        {!unavailable && (() => {
          const origin = (p.shipFrom ?? 'spain') as ShipOrigin
          const sm = SHIP_META[origin]
          const isMeetup = origin === 'meetup'
          return (
            <div style={{
              position: 'absolute', bottom: 8, left: 8,
              background: isMeetup ? 'rgba(192,132,252,.82)' : 'rgba(0,0,0,.62)',
              backdropFilter: 'blur(6px)',
              border: `1px solid ${isMeetup ? 'rgba(192,132,252,.5)' : 'rgba(255,255,255,.15)'}`,
              borderRadius: 20, padding: '2px 8px',
              fontSize: '.62rem', fontWeight: 700, color: '#fff', letterSpacing: '.2px',
            }}>
              {isMeetup ? '🤝 Solo di persona' : `📦 ${sm.flag} A casa o locker`}
            </div>
          )
        })()}

        {/* ESAURITO overlay */}
        {isExhausted && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              background: 'rgba(30,30,30,.75)', backdropFilter: 'blur(2px)',
              borderRadius: 8, padding: '5px 14px',
              fontSize: '.7rem', fontWeight: 800, color: 'rgba(255,255,255,.7)', letterSpacing: '1.5px',
            }}>ESAURITO</div>
          </div>
        )}

        {/* IN ARRIVO overlay */}
        {isComingSoon && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              background: 'rgba(59,130,246,.85)', backdropFilter: 'blur(2px)',
              borderRadius: 8, padding: '5px 14px',
              fontSize: '.7rem', fontWeight: 800, color: '#fff', letterSpacing: '1.5px',
            }}>IN ARRIVO</div>
          </div>
        )}

        {/* Video play indicator */}
        {p.mediaType === 'video' && (
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)',
            borderRadius: 6, padding: '2px 7px',
            fontSize: '.6rem', color: 'rgba(255,255,255,.9)', fontWeight: 600, letterSpacing: '.5px',
          }}>▶ VIDEO</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px 13px 14px', borderTop: '1px solid rgba(61,255,110,.07)' }}>
        <div style={{
          fontFamily: "'Fredoka One', cursive", fontSize: '1rem',
          fontWeight: 400, letterSpacing: '.2px', marginBottom: 4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', color: unavailable ? 'var(--muted)' : 'var(--text)', lineHeight: 1.25,
        }}>
          {p.name}
        </div>
        {p.origin && (
          <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 6 }}>
            🌍 {p.origin}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          {isComingSoon ? (
            <div style={{ fontSize: '.75rem', color: '#7ec8f8', fontWeight: 700 }}>Prossimamente</div>
          ) : isExhausted ? (
            <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>Non disponibile</div>
          ) : minPrice > 0 ? (
            <div style={{
              fontFamily: "'Fredoka One', cursive", fontSize: '1.18rem',
              color: 'var(--green)', textShadow: 'var(--led-green)', letterSpacing: '.2px',
            }}>
              da €{minPrice}
            </div>
          ) : (
            <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>Vedi tagli</div>
          )}

          {!unavailable && (
            <button
              onClick={(e) => { e.stopPropagation(); setDetailProduct(p) }}
              style={{
                background: 'linear-gradient(135deg,var(--green),var(--green2))',
                border: 'none', borderRadius: 8, padding: '6px 14px',
                fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', color: '#000',
                fontFamily: "'Fredoka One', cursive", transition: '.15s',
                letterSpacing: '.3px', boxShadow: '0 2px 8px rgba(61,255,110,.25)', flexShrink: 0,
              }}
            >Scegli</button>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  )
}
