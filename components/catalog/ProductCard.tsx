'use client'
import React from 'react'
import Image from 'next/image'
import type { Product } from '@/hooks/useProducts'
import { useUIStore } from '@/store/uiStore'

const BADGE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  premium: { bg: 'rgba(245,200,66,.15)', color: '#f5c842', border: 'rgba(245,200,66,.45)' },
  frozen:  { bg: 'rgba(59,130,246,.15)', color: '#7ec8f8', border: 'rgba(59,130,246,.45)' },
  new:     { bg: 'rgba(61,255,110,.15)', color: '#3dff6e', border: 'rgba(61,255,110,.45)' },
  hash:    { bg: 'rgba(200,140,60,.15)', color: '#e0a060', border: 'rgba(200,140,60,.45)' },
  cbd:     { bg: 'rgba(61,255,110,.12)', color: '#a0e8b0', border: 'rgba(61,255,110,.35)' },
}

const BADGE_LABELS: Record<string, string> = {
  premium: '💎 Premium',
  frozen:  '🧊 Frozen',
  new:     '✨ Novità',
  hash:    '🪨 Hash',
  cbd:     '🌿 CBD',
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
  const isExhausted = p.stock === 0
  const badgeStyle = p.badge ? (BADGE_COLORS[p.badge] ?? { bg: 'rgba(0,0,0,.7)', color: '#fff', border: 'rgba(255,255,255,.2)' }) : null

  return (
    <div
      onClick={() => setDetailProduct(p)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform .15s, box-shadow .15s',
        willChange: 'transform',
        animation: `fadeInUp .35s ease both`,
        animationDelay: `${index * 0.05}s`,
        opacity: isExhausted ? .6 : 1,
        transform: pressed ? 'scale(.97)' : 'scale(1)',
        boxShadow: pressed ? '0 1px 6px rgba(0,0,0,.3)' : '0 2px 12px rgba(0,0,0,.35)',
      }}
    >
      {/* Media */}
      <div style={{ position: 'relative', paddingBottom: '96%', background: 'var(--bg3)' }}>
        {p.imageUrl ? (
          p.mediaType === 'video' ? (
            <video
              src={p.imageUrl}
              autoPlay muted loop playsInline
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Image
              src={p.imageUrl}
              alt={p.name}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 480px) 50vw, 240px"
            />
          )
        ) : (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '2.8rem',
            background: 'radial-gradient(ellipse at center, rgba(61,255,110,.04) 0%, transparent 70%)',
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

        {/* Badge */}
        {p.badge && !isExhausted && badgeStyle && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            background: badgeStyle.bg,
            backdropFilter: 'blur(8px)',
            border: `1px solid ${badgeStyle.border}`,
            borderRadius: 20,
            padding: '3px 9px', fontSize: '.6rem', fontWeight: 700,
            color: badgeStyle.color,
            letterSpacing: '.3px',
          }}>
            {BADGE_LABELS[p.badge] ?? p.badge}
          </div>
        )}

        {/* ESAURITO */}
        {isExhausted && <div className="badge-esaurito">ESAURITO</div>}

        {/* Video play indicator */}
        {p.mediaType === 'video' && (
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)',
            borderRadius: 6, padding: '2px 7px',
            fontSize: '.6rem', color: 'rgba(255,255,255,.9)', fontWeight: 600,
            letterSpacing: '.5px',
          }}>▶ VIDEO</div>
        )}
      </div>

      {/* Info */}
      <div style={{
        padding: '12px 13px 14px',
        borderTop: '1px solid rgba(61,255,110,.07)',
      }}>
        <div style={{
          fontFamily: "'Fredoka One', cursive", fontSize: '1rem',
          fontWeight: 400, letterSpacing: '.2px', marginBottom: 4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          color: 'var(--text)', lineHeight: 1.25,
        }}>
          {p.name}
        </div>
        {p.origin && (
          <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginBottom: 6 }}>
            🌍 {p.origin}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          {minPrice > 0 ? (
            <div style={{
              fontFamily: "'Fredoka One', cursive", fontSize: '1.18rem',
              color: 'var(--green)', textShadow: 'var(--led-green)',
              letterSpacing: '.2px',
            }}>
              da €{minPrice}
            </div>
          ) : (
            <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>Vedi tagli</div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setDetailProduct(p) }}
            style={{
              background: 'linear-gradient(135deg,var(--green),var(--green2))',
              border: 'none',
              borderRadius: 8, padding: '6px 14px',
              fontSize: '.78rem', fontWeight: 700,
              cursor: 'pointer', color: '#000',
              fontFamily: "'Fredoka One', cursive",
              transition: '.15s',
              letterSpacing: '.3px',
              boxShadow: '0 2px 8px rgba(61,255,110,.25)',
              flexShrink: 0,
            }}
          >
            Scegli
          </button>
        </div>
      </div>
    </div>
  )
}
