'use client'
import Image from 'next/image'
import type { Product } from '@/hooks/useProducts'
import { useUIStore } from '@/store/uiStore'

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
  const minPrice = getMinPrice(p)
  const isExhausted = p.stock === 0

  return (
    <div
      onClick={() => setDetailProduct(p)}
      style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', overflow: 'hidden', cursor: 'pointer',
        transition: '.2s', willChange: 'transform',
        animation: `fadeInUp .35s ease both`,
        animationDelay: `${index * 0.05}s`,
        opacity: isExhausted ? .65 : 1,
      }}
    >
      {/* Media */}
      <div style={{ position: 'relative', paddingBottom: '100%', background: 'var(--bg3)' }}>
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
            alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem',
          }}>
            {p.emoji}
          </div>
        )}

        {/* Badge */}
        {p.badge && !isExhausted && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(6px)',
            border: '1px solid rgba(245,200,66,.4)', borderRadius: 20,
            padding: '3px 8px', fontSize: '.62rem', fontWeight: 700, color: 'var(--gold)',
          }}>
            {BADGE_LABELS[p.badge] ?? p.badge}
          </div>
        )}

        {/* ESAURITO */}
        {isExhausted && <div className="badge-esaurito">ESAURITO</div>}

        {/* Video play indicator */}
        {p.mediaType === 'video' && (
          <div style={{
            position: 'absolute', bottom: 6, right: 6,
            background: 'rgba(0,0,0,.65)', borderRadius: 6,
            padding: '2px 6px', fontSize: '.65rem', color: '#fff',
          }}>▶ VIDEO</div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: 11 }}>
        <div style={{
          fontFamily: "'Fredoka One', cursive", fontSize: '.9rem',
          fontWeight: 400, letterSpacing: '.2px', marginBottom: 3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {p.name}
        </div>
        {p.origin && (
          <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 6 }}>
            🌍 {p.origin}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {minPrice > 0 ? (
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.05rem', color: 'var(--green)', textShadow: 'var(--led-green)' }}>
              da €{minPrice}
            </div>
          ) : (
            <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>Vedi tagli</div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setDetailProduct(p) }}
            style={{
              background: 'var(--bg3)', border: '1px solid rgba(61,255,110,.3)',
              borderRadius: 8, padding: '5px 10px', fontSize: '.7rem', fontWeight: 700,
              cursor: 'pointer', color: 'var(--green)', fontFamily: 'inherit',
              transition: '.2s',
            }}
          >
            Scegli
          </button>
        </div>
      </div>
    </div>
  )
}
