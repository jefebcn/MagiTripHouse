'use client'
import { useRef, useCallback, useState } from 'react'
import Image from 'next/image'
import { useUIStore } from '@/store/uiStore'
import { useCartStore } from '@/store/cartStore'
import { useSwipeToClose } from '@/hooks/useSwipeToClose'
import { useTelegram } from '@/hooks/useTelegram'

function haptic(pattern: number | number[] = 50) {
  try { if (navigator.vibrate) navigator.vibrate(pattern) } catch { /* noop */ }
}

export default function CartDrawer() {
  const { cartOpen, setCartOpen } = useUIStore()
  const { items, changeQty, clear, total } = useCartStore()
  const { user } = useTelegram()
  const panelRef = useRef<HTMLDivElement>(null)
  const [note, setNote] = useState('')

  const close = useCallback(() => setCartOpen(false), [setCartOpen])
  useSwipeToClose(panelRef, close, cartOpen)

  function placeOrder() {
    if (!items.length) return
    const orderId = `MTH-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
    const date = new Date().toLocaleDateString('it-IT')
    const lines = [
      `🛒 *NUOVO ORDINE — Magic Trip House*`,
      `🆔 Ordine: ${orderId}`,
      `👤 Cliente: ${user || 'Anonimo'}`,
      `📅 Data: ${date}`,
      ``,
      `📦 *Prodotti:*`,
      ...items.map((x) => `${x.emoji} ${x.productName} [${x.variantLabel}] ×${x.qty} — €${(x.variantPrice * x.qty).toFixed(2)}`),
      ``,
      `💰 *TOTALE: €${total().toFixed(2)}*`,
    ]
    if (note.trim()) lines.push(``, `📝 Note: ${note.trim()}`)
    const msg = lines.join('\n')
    const tgUrl = `https://t.me/magichous8?text=${encodeURIComponent(msg)}`

    // Save order to DB
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: orderId,
        userId: user || 'anonymous',
        total: total(),
        items: items.map((x) => ({ id: x.id, label: x.variantLabel, price: x.variantPrice, qty: x.qty })),
        note: note.trim() || null,
        referredBy: typeof localStorage !== 'undefined' ? localStorage.getItem('tp_ref') : null,
      }),
    }).catch(() => {})

    haptic([80, 40, 80])
    clear()
    close()
    window.location.href = tgUrl
  }

  if (!cartOpen) return null

  return (
    <div className="panel open">
      <div className="panel-overlay" onClick={close} />
      <div ref={panelRef} className="panel-content">
        <div className="panel-handle" />
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem', letterSpacing: '.5px' }}>
          🛒 Carrello
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px', fontSize: '.88rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>🛒</div>
            Il carrello è vuoto
          </div>
        ) : (
          <>
            {items.map((item) => (
              <div
                key={item.key}
                style={{
                  display: 'flex', gap: 12, alignItems: 'center',
                  background: 'var(--bg3)', borderRadius: 12, padding: '12px',
                }}
              >
                {/* Thumbnail */}
                <div style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.imageUrl ? (
                    item.mediaType === 'video' ? (
                      <span style={{ fontSize: '1.5rem' }}>▶</span>
                    ) : (
                      <Image src={item.imageUrl} alt={item.productName} width={52} height={52} style={{ objectFit: 'cover' }} />
                    )
                  ) : (
                    <span style={{ fontSize: '1.5rem' }}>{item.emoji}</span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.productName}
                  </div>
                  <div style={{ fontSize: '.68rem', color: 'var(--gold)', marginTop: 1 }}>
                    {item.variantLabel}
                  </div>
                  <div style={{ fontSize: '.82rem', color: 'var(--green)', fontWeight: 700 }}>
                    €{(item.variantPrice * item.qty).toFixed(2)}
                  </div>
                </div>

                {/* Qty */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--border)', borderRadius: 8, padding: '2px 4px' }}>
                  <button
                    onClick={() => changeQty(item.key, -1)}
                    style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1rem', cursor: 'pointer', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}
                  >−</button>
                  <span style={{ fontSize: '.9rem', fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{item.qty}</span>
                  <button
                    onClick={() => changeQty(item.key, 1)}
                    style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1rem', cursor: 'pointer', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}
                  >+</button>
                </div>
              </div>
            ))}

            {/* Note */}
            <textarea
              placeholder="📝 Note per l'ordine (opzionale)..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              style={{
                width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 14px', color: 'var(--text)',
                fontSize: '.85rem', fontFamily: 'inherit', resize: 'none', outline: 'none',
              }}
            />

            {/* Total */}
            <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--muted)', fontSize: '.82rem' }}>Totale ordine</span>
              <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem', color: 'var(--green)', textShadow: 'var(--led-green)' }}>
                €{total().toFixed(2)}
              </span>
            </div>

            <button className="checkout-btn" onClick={placeOrder}>
              📲 Conferma & Invia su Telegram →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
