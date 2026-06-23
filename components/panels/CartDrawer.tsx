'use client'
import { useRef, useCallback, useState, useEffect } from 'react'
import Image from 'next/image'
import { useUIStore } from '@/store/uiStore'
import { useCartStore, SHIP_META, type ShipOrigin } from '@/store/cartStore'
import { useSwipeToClose } from '@/hooks/useSwipeToClose'
import { useTelegram } from '@/hooks/useTelegram'

function haptic(pattern: number | number[] = 50) {
  try { if (navigator.vibrate) navigator.vibrate(pattern) } catch { /* noop */ }
}

const ORIGINS: ShipOrigin[] = ['spain', 'italy', 'pharma']

export default function CartDrawer() {
  const { cartOpen, setCartOpen, userHandle, userName, isLoggedIn, setView } = useUIStore()
  const { items, changeQty, clearOrigin, itemsByOrigin, totalByOrigin } = useCartStore()
  const { user: tgUser } = useTelegram()
  const panelRef = useRef<HTMLDivElement>(null)
  const [note, setNote] = useState<Record<ShipOrigin, string>>({ spain: '', italy: '', pharma: '' })
  const [affBalance, setAffBalance] = useState(0)
  const [creditOrigin, setCreditOrigin] = useState<ShipOrigin | null>(null)

  const close = useCallback(() => setCartOpen(false), [setCartOpen])
  useSwipeToClose(panelRef, close, cartOpen)

  useEffect(() => {
    if (!cartOpen || !isLoggedIn || !userHandle) return
    fetch(`/api/affiliates/me?username=${userHandle}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.balance > 0) setAffBalance(d.balance) })
      .catch(() => {})
  }, [cartOpen, isLoggedIn, userHandle])

  function placeOrder(origin: ShipOrigin) {
    const oItems = itemsByOrigin(origin)
    if (!oItems.length || !isLoggedIn) return

    const sm = SHIP_META[origin]
    const displayName = userName || tgUser || 'Sconosciuto'
    const userId = userHandle || tgUser || 'unknown'
    const subtotal = totalByOrigin(origin)
    const creditApplied = creditOrigin === origin ? Math.min(affBalance, subtotal) : 0
    const productTotal = subtotal - creditApplied
    const finalTotal = productTotal + sm.shipCost

    const orderId = `MTH-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
    const date = new Date().toLocaleDateString('it-IT')
    const isPharma = origin === 'pharma'
    const lines = [
      `🛒 *NUOVO ORDINE — Magic Trip House*`,
      `🆔 Ordine: ${orderId}`,
      `👤 Cliente: ${displayName}`,
      `📅 Data: ${date}`,
      `${sm.flag} Spedizione: ${sm.label} (${sm.delivery})`,
      ``,
      `📦 *Prodotti:*`,
      ...oItems.map((x) => `${x.emoji} ${x.productName} [${x.variantLabel}] ×${x.qty} — €${(x.variantPrice * x.qty).toFixed(2)}`),
      ``,
      `Subtotale: €${subtotal.toFixed(2)}`,
    ]
    if (creditApplied > 0) lines.push(`🎁 Credito affiliato: −€${creditApplied.toFixed(2)}`)
    if (isPharma) {
      lines.push(`🚚 Spedizione: da confermare (5–19€ UE · 12–27€ extra-UE)`)
      lines.push(`💰 *TOTALE prodotti: €${(subtotal - creditApplied).toFixed(2)}* (+spedizione)`)
    } else {
      lines.push(`🚚 Spedizione: €${sm.shipCost.toFixed(2)}`)
      lines.push(`💰 *TOTALE: €${finalTotal.toFixed(2)}*`)
    }
    if (note[origin].trim()) lines.push(``, `📝 Note: ${note[origin].trim()}`)

    const msg = lines.join('\n')
    const tgUrl = `https://t.me/magichous8?text=${encodeURIComponent(msg)}`

    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: orderId,
        userId,
        total: finalTotal,
        items: oItems.map((x) => ({ id: x.id, name: x.productName, emoji: x.emoji, label: x.variantLabel, price: x.variantPrice, qty: x.qty })),
        note: `[${sm.label}] ${note[origin].trim()}`.trim() || null,
        referredBy: typeof localStorage !== 'undefined' ? localStorage.getItem('tp_ref') : null,
        affiliateCredit: creditApplied > 0 ? creditApplied : undefined,
        affiliateUsername: creditApplied > 0 ? userHandle : undefined,
      }),
    }).catch(() => {})

    haptic([80, 40, 80])
    clearOrigin(origin)
    if (creditOrigin === origin) { setCreditOrigin(null); setAffBalance(b => Math.max(0, b - creditApplied)) }
    setNote(n => ({ ...n, [origin]: '' }))

    const allRemaining = useCartStore.getState().items.length
    if (allRemaining === 0) close()

    const tg = (window as Window & { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } } }).Telegram?.WebApp
    if (tg?.openTelegramLink) tg.openTelegramLink(tgUrl)
    else window.open(tgUrl, '_blank')
  }

  if (!cartOpen) return null

  const totalCount = items.reduce((s, x) => s + x.qty, 0)

  return (
    <div className="panel open">
      <div className="panel-overlay" onClick={close} />
      <div ref={panelRef} className="panel-content">
        <div className="panel-handle" />
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem', letterSpacing: '.5px' }}>
          🛒 Carrello
        </div>

        {totalCount === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px', fontSize: '.88rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>🛒</div>
            Il carrello è vuoto
            <button
              onClick={() => { close(); setView('hub') }}
              style={{
                display: 'block', margin: '18px auto 0', background: 'rgba(61,255,110,.1)',
                border: '1px solid rgba(61,255,110,.3)', color: 'var(--green)',
                borderRadius: 20, padding: '9px 22px', fontFamily: 'inherit', fontSize: '.84rem', cursor: 'pointer',
              }}
            >Esplora i prodotti</button>
          </div>
        ) : !isLoggedIn ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: 10 }}>
              🔒 Devi accedere per effettuare un ordine
            </div>
            <button
              onClick={() => { close(); setView('account') }}
              style={{
                width: '100%', padding: '14px', borderRadius: 14, fontFamily: 'inherit',
                fontWeight: 700, fontSize: '.95rem', cursor: 'pointer',
                background: 'linear-gradient(135deg,rgba(61,255,110,.22),rgba(61,255,110,.1))',
                border: '1.5px solid rgba(61,255,110,.6)', color: 'var(--green)',
                boxShadow: '0 0 20px rgba(61,255,110,.18)',
              }}
            >👤 Accedi o Registrati</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {ORIGINS.map((origin) => {
              const oItems = itemsByOrigin(origin)
              if (!oItems.length) return null
              const sm = SHIP_META[origin]
              const subtotal = totalByOrigin(origin)
              const creditApplied = creditOrigin === origin ? Math.min(affBalance, subtotal) : 0
              const isPharma = origin === 'pharma'
              const finalTotal = isPharma ? subtotal - creditApplied : subtotal - creditApplied + sm.shipCost

              return (
                <div key={origin} style={{
                  border: `1.5px solid ${sm.color}44`, borderRadius: 16,
                  padding: '14px 12px', background: `linear-gradient(180deg, ${sm.color}0a, transparent 40%)`,
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  {/* Section header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.3rem' }}>{sm.flag}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.98rem', color: sm.color }}>
                        Spedizione {sm.label}
                      </div>
                      <div style={{ fontSize: '.66rem', color: 'var(--muted)' }}>🚚 {sm.delivery}</div>
                    </div>
                  </div>

                  {/* Items */}
                  {oItems.map((item) => (
                    <div key={item.key} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg3)', borderRadius: 12, padding: '10px' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.imageUrl ? (
                          item.mediaType === 'video'
                            ? <span style={{ fontSize: '1.4rem' }}>▶</span>
                            : <Image src={item.imageUrl} alt={item.productName} width={48} height={48} style={{ objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '1.4rem' }}>{item.emoji}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.productName}</div>
                        <div style={{ fontSize: '.66rem', color: 'var(--gold)', marginTop: 1 }}>{item.variantLabel}</div>
                        <div style={{ fontSize: '.8rem', color: 'var(--green)', fontWeight: 700 }}>€{(item.variantPrice * item.qty).toFixed(2)}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--border)', borderRadius: 8, padding: '2px 4px' }}>
                        <button onClick={() => changeQty(item.key, -1)} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1rem', cursor: 'pointer', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>−</button>
                        <span style={{ fontSize: '.88rem', fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{item.qty}</span>
                        <button onClick={() => changeQty(item.key, 1)} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1rem', cursor: 'pointer', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>+</button>
                      </div>
                    </div>
                  ))}

                  {/* Affiliate credit toggle */}
                  {affBalance > 0 && (
                    <button
                      onClick={() => setCreditOrigin(c => c === origin ? null : origin)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '9px 12px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                        background: creditOrigin === origin ? 'rgba(61,255,110,.1)' : 'var(--bg3)',
                        border: `1px solid ${creditOrigin === origin ? 'rgba(61,255,110,.45)' : 'var(--border)'}`,
                      }}
                    >
                      <span style={{ fontSize: '.78rem', fontWeight: 700, color: creditOrigin === origin ? 'var(--green)' : 'var(--text)' }}>
                        🎁 Usa credito (€{affBalance.toFixed(2)})
                      </span>
                      {creditOrigin === origin
                        ? <span style={{ fontSize: '.8rem', fontWeight: 800, color: 'var(--green)' }}>−€{creditApplied.toFixed(2)}</span>
                        : <span style={{ fontSize: '.7rem', color: 'var(--muted)' }}>tocca per applicare</span>}
                    </button>
                  )}

                  {/* Pharma TOS */}
                  {isPharma && (
                    <div style={{
                      background: 'rgba(129,140,248,.07)', border: '1px solid rgba(129,140,248,.25)',
                      borderRadius: 10, padding: '10px 12px', fontSize: '.69rem', color: 'rgba(199,210,254,.75)',
                      lineHeight: 1.5,
                    }}>
                      <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 4 }}>⚠️ Termini spedizione Pharma EU</div>
                      <div>🚚 UE: 5–19€ · 5–16 gg lavorativi · Extra-UE: 12–27€ · 7–28 gg</div>
                      <div>📦 Più brand = spedizioni separate per ciascuno</div>
                      <div>⏱ Segnalare problemi entro 45 giorni</div>
                      <div>🚫 No rimborsi/resi dopo pagamento</div>
                      <div>🔁 Sequestro dogana: ri-spedizione con foto 120 dpi + nuovo indirizzo</div>
                    </div>
                  )}

                  {/* Note */}
                  <textarea
                    placeholder={`📝 Note ordine ${sm.label} (opzionale)…`}
                    value={note[origin]}
                    onChange={(e) => setNote(n => ({ ...n, [origin]: e.target.value }))}
                    rows={2}
                    style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', color: 'var(--text)', fontSize: '.82rem', fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                  />

                  {/* Totals */}
                  <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: 12, fontSize: '.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', marginBottom: 4 }}>
                      <span>Subtotale</span><span>€{subtotal.toFixed(2)}</span>
                    </div>
                    {creditApplied > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--green)', marginBottom: 4 }}>
                        <span>🎁 Credito</span><span>−€{creditApplied.toFixed(2)}</span>
                      </div>
                    )}
                    {isPharma ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', marginBottom: 6 }}>
                        <span>🚚 Spedizione</span><span style={{ fontSize: '.72rem' }}>variabile (da conf.)</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', marginBottom: 6 }}>
                        <span>🚚 Spedizione</span><span>€{sm.shipCost.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                      <span style={{ color: 'var(--muted)' }}>{isPharma ? 'Totale prodotti' : 'Totale'}</span>
                      <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.35rem', color: 'var(--green)', textShadow: 'var(--led-green)' }}>€{finalTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  <button className="checkout-btn" onClick={() => placeOrder(origin)}>
                    {sm.flag} Invia ordine {sm.label} →
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
