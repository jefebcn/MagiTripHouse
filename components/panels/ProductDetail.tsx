'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { useUIStore } from '@/store/uiStore'
import { useCartStore, SHIP_META, type ShipOrigin } from '@/store/cartStore'
import { useSwipeToClose } from '@/hooks/useSwipeToClose'
import type { Variant } from '@/hooks/useProducts'

function haptic(ms = 50) {
  try { if (navigator.vibrate) navigator.vibrate(ms) } catch { /* noop */ }
}

function parseGrams(label: string): number {
  return parseFloat(label.replace(/[^0-9.]/g, '')) || 0
}

// Returns the highest tier whose gram threshold is ≤ requested grams
function getActiveTier(grams: number, variants: Variant[]): Variant | null {
  const sorted = [...variants]
    .filter(v => parseGrams(v.label) > 0)
    .sort((a, b) => parseGrams(a.label) - parseGrams(b.label))
  if (!sorted.length) return null
  let active = sorted[0]
  for (const v of sorted) {
    if (parseGrams(v.label) <= grams) active = v
    else break
  }
  return active
}

export default function ProductDetail() {
  const { detailProduct: p, setDetailProduct, openLightbox } = useUIStore()
  const addItem = useCartStore((s) => s.addItem)
  const panelRef = useRef<HTMLDivElement>(null)
  const [qty, setQty] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [customGrams, setCustomGrams] = useState<number>(0)

  const close = useCallback(() => setDetailProduct(null), [setDetailProduct])
  useSwipeToClose(panelRef, close, !!p)

  // Reset state when product changes
  useEffect(() => {
    if (!p) return
    setSelectedVariant(null)
    setQty(1)
    const first = p.variants?.[0]
    setCustomGrams(first ? parseGrams(first.label) || 1 : 0)
  }, [p?.id])

  if (!p) return null
  const product = p

  const variant = selectedVariant ?? (product.variants?.[0] ?? null)

  // Detect gram-based pricing (numeric labels like "10", "20g", "1g")
  const isGramBased = (product.variants?.length ?? 0) > 0 &&
    product.variants.some(v => parseGrams(v.label) > 0)

  // Active tier = highest tier whose threshold ≤ customGrams
  const activeTier = isGramBased && customGrams > 0
    ? getActiveTier(customGrams, product.variants)
    : variant

  const tierGrams = activeTier ? parseGrams(activeTier.label) : 0
  const tierPricePerG = tierGrams > 0 ? activeTier!.price / tierGrams : 0

  const displayPrice = isGramBased && customGrams > 0 && tierPricePerG > 0
    ? Math.round(customGrams * tierPricePerG * 100) / 100
    : (variant?.price ?? 0)

  const displayPricePerG = isGramBased && tierPricePerG > 0
    ? tierPricePerG.toFixed(2)
    : (variant && parseGrams(variant.label) > 0
        ? (variant.price / parseGrams(variant.label)).toFixed(2)
        : null)

  const displayLabel = isGramBased && customGrams > 0
    ? `${customGrams}g`
    : (variant?.label ?? '')

  function handleAdd() {
    const effectiveVariant: Variant = isGramBased && customGrams > 0
      ? { label: `${customGrams}g`, price: displayPrice }
      : (variant ?? { label: '?', price: 0 })
    addItem(product.id, product.name, effectiveVariant, qty, product.imageUrl, product.mediaType, product.emoji, (product.shipFrom ?? 'spain') as ShipOrigin)
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

  const inputStyle: React.CSSProperties = {
    width: 64, textAlign: 'center', background: 'var(--bg)',
    border: 'none', outline: 'none', color: 'var(--text)',
    fontSize: '1rem', fontWeight: 700, padding: '6px 0',
    MozAppearance: 'textfield',
  }

  return (
    <div className="panel open">
      <div className="panel-overlay" onClick={close} />
      <div ref={panelRef} className="panel-content" style={{ gap: 14 }}>
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
          {(() => {
            const origin = (product.shipFrom ?? 'spain') as ShipOrigin
            const sm = SHIP_META[origin]
            const isMeetup = origin === 'meetup'
            return (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8,
                background: 'var(--bg3)', border: `1px solid ${sm.color}44`,
                borderRadius: 20, padding: '4px 12px',
              }}>
                <span>{sm.flag}</span>
                <span style={{ fontSize: '.74rem', color: 'var(--text)', fontWeight: 600 }}>{isMeetup ? 'Ritiro in loco' : `Spedizione ${sm.label}`}</span>
                <span style={{ fontSize: '.7rem', color: 'var(--muted)' }}>· {isMeetup ? '🤝' : '🚚'} {sm.delivery}</span>
              </div>
            )
          })()}
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
              <span key={t} style={{
                background: 'var(--bg3)', border: '1px solid rgba(61,255,110,.15)',
                borderRadius: 20, padding: '4px 11px', fontSize: '.72rem', color: 'var(--muted)',
              }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Variants */}
        {product.variants?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.8px', fontWeight: 700 }}>
              📦 Seleziona Formato
            </div>

            {/* Quick-select buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {product.variants.map((v, i) => {
                const vg = parseGrams(v.label)
                const isActive = isGramBased
                  ? activeTier?.label === v.label
                  : variant?.label === v.label
                return (
                  <button
                    key={i}
                    className={`variant-btn${isActive ? ' selected' : ''}`}
                    onClick={() => {
                      setSelectedVariant(v)
                      if (isGramBased && vg > 0) setCustomGrams(vg)
                    }}
                  >
                    {v.label}
                  </button>
                )
              })}
            </div>

            {/* Custom gram input */}
            {isGramBased && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '.78rem', color: 'var(--muted)', flexShrink: 0 }}>
                  Quantità:
                </span>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 10, overflow: 'hidden',
                }}>
                  <button
                    onClick={() => setCustomGrams(g => Math.max(1, g - 1))}
                    style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1.1rem', cursor: 'pointer', padding: '6px 12px' }}
                  >−</button>
                  <input
                    type="number"
                    min="1"
                    value={customGrams || ''}
                    onChange={e => {
                      const v = parseFloat(e.target.value)
                      if (!isNaN(v) && v > 0) setCustomGrams(v)
                    }}
                    style={inputStyle}
                  />
                  <button
                    onClick={() => setCustomGrams(g => g + 1)}
                    style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1.1rem', cursor: 'pointer', padding: '6px 12px' }}
                  >+</button>
                </div>
                <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>g</span>
                {activeTier && (
                  <span style={{ fontSize: '.72rem', color: 'var(--green)', marginLeft: 'auto', flexShrink: 0 }}>
                    Fascia {activeTier.label}
                  </span>
                )}
              </div>
            )}
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
                €{displayPrice}
                {displayPricePerG && (
                  <span style={{ color: 'var(--muted)', fontSize: '.75rem' }}>
                    {' '}· €{displayPricePerG}/g
                  </span>
                )}
              </div>
              {displayLabel && (
                <div style={{ color: 'var(--muted)', fontSize: '.75rem', marginTop: 2 }}>
                  {displayLabel}
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

          {(product.shipFrom === 'spain' || product.shipFrom === 'italy' || !product.shipFrom) && (
            <div style={{
              textAlign: 'center', fontSize: '.73rem',
              color: 'var(--muted)', marginTop: 4,
              lineHeight: 1.5,
            }}>
              🚚 Spedizione non inclusa nel prezzo · <strong style={{ color: 'rgba(255,255,255,.45)' }}>+€10</strong> calcolata al carrello
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
