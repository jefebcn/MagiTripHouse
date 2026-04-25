'use client'
import { useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { useUIStore } from '@/store/uiStore'
import { useCartStore } from '@/store/cartStore'
import { useSwipeToClose } from '@/hooks/useSwipeToClose'
import type { Variant } from '@/hooks/useProducts'

function haptic(ms = 50) {
  try { if (navigator.vibrate) navigator.vibrate(ms) } catch { /* noop */ }
}

export default function ProductDetail() {
  const { detailProduct: p, setDetailProduct, openLightbox } = useUIStore()
  const addItem = useCartStore((s) => s.addItem)
  const panelRef = useRef<HTMLDivElement>(null)
  const [qty, setQty] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)

  const close = useCallback(() => setDetailProduct(null), [setDetailProduct])
  useSwipeToClose(panelRef, close, !!p)

  if (!p) return null

  const product = p!
  const variant = selectedVariant ?? (product.variants?.[0] ?? null)
  const price = variant?.price ?? 0
  const grams = variant ? parseFloat(variant.label) : 0
  const pricePerG = grams > 0 ? (price / grams).toFixed(2) : null

  function handleAdd() {
    if (!variant) return
    addItem(product.id, product.name, variant, qty, product.imageUrl, product.mediaType, product.emoji)
    close()
    haptic(60)
  }

  function shareProduct() {
    const text = `🌿 ${product.name} — ${product.origin ?? ''}\nVedi nel catalogo MagiTripHouse`
    if (navigator.share) {
      navigator.share({ title: product.name, text }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text)
    }
  }

  return (
    <div className="panel open">
      <div className="panel-overlay" onClick={close} />
      <div
        ref={panelRef}
        className="panel-content"
        style={{ gap: 14 }}
      >
        <div className="panel-handle" />

        {/* Image */}
        <div
          onClick={() => product.imageUrl && openLightbox(product.imageUrl, product.mediaType ?? 'image', product.name)}
          style={{
            borderRadius: 18, overflow: 'hidden', position: 'relative',
            height: 'clamp(260px, 65vw, 380px)',
            background: 'var(--bg3)', cursor: p.imageUrl ? 'zoom-in' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {product.imageUrl ? (
            product.mediaType === 'video' ? (
              <video
                src={product.imageUrl}
                autoPlay muted loop playsInline
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
              />
            ) : (
              <Image src={product.imageUrl} alt={product.name} fill style={{ objectFit: 'cover' }} sizes="480px" />
            )
          ) : (
            <span style={{ fontSize: '5rem' }}>{product.emoji}</span>
          )}

          {/* Share overlay */}
          <button
            onClick={(e) => { e.stopPropagation(); shareProduct() }}
            style={{
              position: 'absolute', top: 10, right: 10, zIndex: 3,
              background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,.15)', borderRadius: 20,
              padding: '5px 11px', color: '#fff', fontSize: '.72rem', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            📤 Condividi
          </button>

          {/* Zoom hint */}
          {product.imageUrl && (
            <div style={{
              position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
              fontSize: '.7rem', background: 'rgba(0,0,0,.6)', borderRadius: 20,
              padding: '4px 10px', color: '#fff', backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,.1)', pointerEvents: 'none',
            }}>
              🔍 Zoom
            </div>
          )}
        </div>

        {/* Name + origin */}
        <div>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.65rem', lineHeight: 1.2 }}>
            {product.name}
          </div>
          {product.origin && (
            <div style={{ color: 'var(--muted)', fontSize: '.8rem', marginTop: 5 }}>
              🌍 {product.origin}
            </div>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <div style={{ color: '#b8d4bb', fontSize: '.88rem', lineHeight: 1.65 }}>
            {product.description}
          </div>
        )}

        {/* Tags */}
        {product.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {product.tags.map((t) => (
              <span
                key={t}
                style={{
                  background: 'var(--bg3)', border: '1px solid rgba(61,255,110,.15)',
                  borderRadius: 20, padding: '4px 11px', fontSize: '.72rem', color: 'var(--muted)',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Variants */}
        {product.variants?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: 700 }}>
              📦 Seleziona Formato
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {product.variants.map((v, i) => (
                <button
                  key={i}
                  className={`variant-btn${variant?.label === v.label ? ' selected' : ''}`}
                  onClick={() => setSelectedVariant(v)}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Price card */}
        <div style={{
          background: 'var(--bg3)', border: '1px solid rgba(61,255,110,.1)',
          borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '2.1rem', color: 'var(--green)', textShadow: 'var(--led-green)' }}>
                €{price}
                {pricePerG && (
                  <span style={{ color: 'var(--muted)', fontSize: '.75rem' }}>
                    {' '}· €{pricePerG}/g
                  </span>
                )}
              </div>
              {variant && (
                <div style={{ color: 'var(--muted)', fontSize: '.75rem', marginTop: 2 }}>
                  {variant.label}
                </div>
              )}
            </div>

            {/* Qty selector */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 11,
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '8px 14px', flexShrink: 0,
            }}>
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1.2rem', cursor: 'pointer', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}
              >−</button>
              <span style={{ fontWeight: 700, fontSize: '1rem', minWidth: 22, textAlign: 'center' }}>{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1.2rem', cursor: 'pointer', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}
              >+</button>
            </div>
          </div>

          {product.stock === 0 ? (
            <button className="checkout-btn" disabled style={{ opacity: .45, pointerEvents: 'none' }}>
              ❌ Prodotto Esaurito
            </button>
          ) : (
            <button className="checkout-btn" onClick={handleAdd}>
              🛒 Aggiungi al Carrello
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
