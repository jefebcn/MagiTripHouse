'use client'
import { useRef, useCallback, useState, useEffect } from 'react'
import Image from 'next/image'
import { useUIStore } from '@/store/uiStore'
import { useCartStore } from '@/store/cartStore'
import { useSwipeToClose } from '@/hooks/useSwipeToClose'
import { useTelegram } from '@/hooks/useTelegram'

function haptic(pattern: number | number[] = 50) {
  try { if (navigator.vibrate) navigator.vibrate(pattern) } catch { /* noop */ }
}

export default function CartDrawer() {
  const { cartOpen, setCartOpen, userHandle, userName, isLoggedIn, setView } = useUIStore()
  const { items, changeQty, clear, total } = useCartStore()
  const { user: tgUser } = useTelegram()
  const panelRef = useRef<HTMLDivElement>(null)
  const [note, setNote] = useState('')
  const [affBalance, setAffBalance] = useState(0)
  const [useCredit, setUseCredit] = useState(false)

  const close = useCallback(() => setCartOpen(false), [setCartOpen])
  useSwipeToClose(panelRef, close, cartOpen)

  // Fetch affiliate balance when cart opens
  useEffect(() => {
    if (!cartOpen || !isLoggedIn || !userHandle) return
    fetch(`/api/affiliates/me?username=${userHandle}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.balance > 0) setAffBalance(d.balance) })
      .catch(() => {})
  }, [cartOpen, isLoggedIn, userHandle])

  const creditApplied = useCredit ? Math.min(affBalance, total()) : 0
  const finalTotal = total() - creditApplied

  function placeOrder() {
    if (!items.length) return
    if (!isLoggedIn) return

    const displayName = userName || tgUser || 'Sconosciuto'
    const userId = userHandle || tgUser || 'unknown'

    const orderId = `MTH-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
    const date = new Date().toLocaleDateString('it-IT')
    const lines = [
      `🛒 *NUOVO ORDINE — Magic Trip House*`,
      `🆔 Ordine: ${orderId}`,
      `👤 Cliente: ${displayName}`,
      `📅 Data: ${date}`,
      ``,
      `📦 *Prodotti:*`,
      ...items.map((x) => `${x.emoji} ${x.productName} [${x.variantLabel}] ×${x.qty} — €${(x.variantPrice * x.qty).toFixed(2)}`),
      ``,
    ]
    if (creditApplied > 0) lines.push(`🎁 Credito affiliato: −€${creditApplied.toFixed(2)}`, ``)
    lines.push(`💰 *TOTALE: €${finalTotal.toFixed(2)}*`)
    if (note.trim()) lines.push(``, `📝 Note: ${note.trim()}`)

    const msg = lines.join('\n')
    const tgUrl = `https://t.me/magichous8?text=${encodeURIComponent(msg)}`

    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: orderId,
        userId,
        total: finalTotal,
        items: items.map((x) => ({ id: x.id, name: x.productName, emoji: x.emoji, label: x.variantLabel, price: x.variantPrice, qty: x.qty })),
        note: note.trim() || null,
        referredBy: typeof localStorage !== 'undefined' ? localStorage.getItem('tp_ref') : null,
        affiliateCredit: creditApplied > 0 ? creditApplied : undefined,
        affiliateUsername: creditApplied > 0 ? userHandle : undefined,
      }),
    }).catch(() => {})

    haptic([80, 40, 80])
    clear()
    setUseCredit(false)
    setAffBalance(0)
    close()

    const tg = (window as Window & { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } } }).Telegram?.WebApp
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(tgUrl)
    } else {
      window.open(tgUrl, '_blank')
    }
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
                style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg3)', borderRadius: 12, padding: '12px' }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.imageUrl ? (
                    item.mediaType === 'video'
                      ? <span style={{ fontSize: '1.5rem' }}>▶</span>
                      : <Image src={item.imageUrl} alt={item.productName} width={52} height={52} style={{ objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '1.5rem' }}>{item.emoji}</span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.productName}
                  </div>
                  <div style={{ fontSize: '.68rem', color: 'var(--gold)', marginTop: 1 }}>{item.variantLabel}</div>
                  <div style={{ fontSize: '.82rem', color: 'var(--green)', fontWeight: 700 }}>
                    €{(item.variantPrice * item.qty).toFixed(2)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--border)', borderRadius: 8, padding: '2px 4px' }}>
                  <button onClick={() => changeQty(item.key, -1)} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1rem', cursor: 'pointer', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>−</button>
                  <span style={{ fontSize: '.9rem', fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{item.qty}</span>
                  <button onClick={() => changeQty(item.key, 1)} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1rem', cursor: 'pointer', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>+</button>
                </div>
              </div>
            ))}

            {/* Affiliate credit toggle */}
            {affBalance > 0 && (
              <button
                onClick={() => setUseCredit(u => !u)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                  background: useCredit ? 'rgba(61,255,110,.1)' : 'var(--bg3)',
                  border: `1.5px solid ${useCredit ? 'rgba(61,255,110,.45)' : 'var(--border)'}`,
                  transition: 'all .2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1rem' }}>🎁</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '.82rem', fontWeight: 700, color: useCredit ? 'var(--green)' : 'var(--text)' }}>
                      Credito affiliato
                    </div>
                    <div style={{ fontSize: '.65rem', color: 'var(--muted)' }}>
                      Disponibile: €{affBalance.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {useCredit && (
                    <span style={{ fontSize: '.82rem', fontWeight: 800, color: 'var(--green)' }}>
                      −€{creditApplied.toFixed(2)}
                    </span>
                  )}
                  <div style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: useCredit ? 'var(--green)' : 'var(--border)',
                    position: 'relative', transition: 'background .2s', flexShrink: 0,
                  }}>
                    <div style={{
                      position: 'absolute', top: 2, left: useCredit ? 18 : 2,
                      width: 16, height: 16, borderRadius: 8, background: '#fff',
                      transition: 'left .2s',
                    }} />
                  </div>
                </div>
              </button>
            )}

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
            <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: 14 }}>
              {creditApplied > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>Subtotale</span>
                  <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>€{total().toFixed(2)}</span>
                </div>
              )}
              {creditApplied > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '.78rem', color: 'var(--green)' }}>🎁 Credito affiliato</span>
                  <span style={{ fontSize: '.78rem', color: 'var(--green)', fontWeight: 700 }}>−€{creditApplied.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--muted)', fontSize: '.82rem' }}>Totale ordine</span>
                <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem', color: 'var(--green)', textShadow: 'var(--led-green)' }}>
                  €{finalTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {isLoggedIn ? (
              <button className="checkout-btn" onClick={placeOrder}>
                📲 Conferma & Invia su Telegram →
              </button>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 10 }}>
                  🔒 Devi accedere per effettuare un ordine
                </div>
                <button
                  onClick={() => { close(); setView('account') }}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 14,
                    fontFamily: 'inherit', fontWeight: 700, fontSize: '.95rem', cursor: 'pointer',
                    background: 'linear-gradient(135deg,rgba(61,255,110,.22),rgba(61,255,110,.1))',
                    border: '1.5px solid rgba(61,255,110,.6)', color: 'var(--green)',
                    boxShadow: '0 0 20px rgba(61,255,110,.18)',
                  }}
                >👤 Accedi o Registrati</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
