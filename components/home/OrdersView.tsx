'use client'
import { useCallback, useEffect, useState } from 'react'
import { useUIStore } from '@/store/uiStore'

interface OrderLine { name?: string; emoji?: string; label?: string; price?: number; qty?: number }
interface Order { id: string; status: string; tracking: string | null; total: number; items: OrderLine[]; note: string | null; createdAt: string }

const STEPS = [
  { key: 'pending',   icon: '🧾', label: 'Ordinato'   },
  { key: 'paid',      icon: '✅', label: 'Pagato'     },
  { key: 'shipped',   icon: '📦', label: 'Spedito'    },
  { key: 'delivered', icon: '🎉', label: 'Consegnato' },
]

const STATUS_TEXT: Record<string, { text: string; color: string }> = {
  pending:   { text: 'In attesa di pagamento', color: '#f5c842' },
  paid:      { text: 'Pagamento ricevuto · in preparazione', color: '#3dff6e' },
  shipped:   { text: 'Spedito · in viaggio', color: '#7ec8f8' },
  delivered: { text: 'Consegnato', color: '#3dff6e' },
  cancelled: { text: 'Annullato', color: '#e83b3b' },
}

function openTelegram(url: string) {
  const tg = (window as Window & { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } } }).Telegram?.WebApp
  if (tg?.openTelegramLink) tg.openTelegramLink(url)
  else window.open(url, '_blank')
}

export default function OrdersView() {
  const { view, setView, sessionToken } = useUIStore()
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!sessionToken) return
    fetch('/api/orders/mine', { headers: { Authorization: `Bearer ${sessionToken}` } })
      .then(r => r.ok ? r.json() : [])
      .then((d: Order[]) => {
        const list = Array.isArray(d) ? d : []
        setOrders(list)
        // Apre in automatico l'ordine più recente ancora in corso
        setOpen(o => o ?? list.find(x => x.status !== 'delivered' && x.status !== 'cancelled')?.id ?? null)
      })
      .catch(() => setOrders([]))
  }, [sessionToken])

  // Ricarica ogni volta che si apre la scheda (stato/tracking aggiornati dall'admin)
  useEffect(() => { if (view === 'orders') load() }, [view, load])

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
    setCopied(text)
    setTimeout(() => setCopied(c => c === text ? null : c), 1800)
  }

  const active = orders?.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length ?? 0

  return (
    <div style={{ padding: '18px 16px 110px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.45rem' }}>📦 I miei ordini</div>
        <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 2 }}>
          {orders === null ? 'Caricamento…' : orders.length === 0 ? 'Nessun ordine ancora' : `${orders.length} ordin${orders.length === 1 ? 'e' : 'i'} · ${active} in corso`}
        </div>
      </div>

      {orders !== null && orders.length === 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: 8 }}>🛍️</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Non hai ancora ordinato</div>
          <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: 16 }}>Qui vedrai stato, pagamento e tracking di ogni ordine.</div>
          <button onClick={() => setView('catalog')} style={{
            padding: '11px 22px', borderRadius: 12, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer',
            background: 'rgba(61,255,110,.15)', border: '1px solid rgba(61,255,110,.5)', color: 'var(--green)',
          }}>Vai al catalogo ›</button>
        </div>
      )}

      {orders?.map(o => {
        const st = STATUS_TEXT[o.status] ?? { text: o.status, color: 'var(--muted)' }
        const stepIdx = STEPS.findIndex(s => s.key === o.status)
        const isOpen = open === o.id
        const items = Array.isArray(o.items) ? o.items : []
        const date = new Date(o.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
        return (
          <div key={o.id} style={{
            background: 'var(--card)', border: `1px solid ${isOpen ? 'rgba(61,255,110,.3)' : 'var(--border)'}`,
            borderRadius: 16, overflow: 'hidden', transition: '.2s',
          }}>
            <button onClick={() => setOpen(isOpen ? null : o.id)} style={{
              width: '100%', background: 'none', border: 'none', padding: '14px 14px 12px', cursor: 'pointer',
              fontFamily: 'inherit', color: 'var(--text)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.9rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.id}</span>
                <span style={{ fontFamily: "'Fredoka One', cursive", color: 'var(--green)' }}>€{o.total.toFixed(2)}</span>
                <span style={{ color: 'var(--muted)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: '.2s' }}>›</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.72rem' }}>
                <span style={{ color: st.color, fontWeight: 700 }}>● {st.text}</span>
                <span style={{ color: 'var(--muted)', marginLeft: 'auto' }}>{date}</span>
              </div>
            </button>

            {/* Avanzamento */}
            {stepIdx >= 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', padding: '0 14px 12px' }}>
                {STEPS.map((s, i) => {
                  const done = i <= stepIdx
                  return (
                    <div key={s.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      {i > 0 && (
                        <div style={{
                          position: 'absolute', top: 13, right: '50%', width: '100%', height: 2,
                          background: done ? 'var(--green)' : 'var(--border)', boxShadow: done ? '0 0 6px rgba(61,255,110,.5)' : 'none',
                        }} />
                      )}
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', zIndex: 1, fontSize: '.8rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done ? 'rgba(61,255,110,.15)' : 'var(--bg3)',
                        border: `1.5px solid ${done ? 'var(--green)' : 'var(--border)'}`,
                        filter: done ? 'none' : 'grayscale(1)', opacity: done ? 1 : .55,
                      }}>{s.icon}</div>
                      <div style={{ fontSize: '.58rem', marginTop: 4, color: done ? 'var(--text)' : 'var(--muted)' }}>{s.label}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {o.tracking && (
              <button onClick={() => copy(o.tracking!)} style={{
                margin: '0 14px 12px', width: 'calc(100% - 28px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                background: 'var(--bg)', border: '1px solid rgba(59,130,246,.3)', borderRadius: 10,
                padding: '9px 11px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              }}>
                <span style={{ fontSize: '.72rem', color: 'var(--muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  📍 Tracking: <strong style={{ color: '#7ec8f8', fontFamily: 'monospace' }}>{o.tracking}</strong>
                </span>
                <span style={{ fontSize: '.68rem', color: copied === o.tracking ? 'var(--green)' : 'var(--muted)', flexShrink: 0 }}>
                  {copied === o.tracking ? '✓ copiato' : '📋 copia'}
                </span>
              </button>
            )}

            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((it, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '.8rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{it.emoji ?? '📦'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</div>
                      <div style={{ fontSize: '.66rem', color: 'var(--gold)' }}>{it.label} × {it.qty ?? 1}</div>
                    </div>
                    {typeof it.price === 'number' && (
                      <span style={{ color: 'var(--muted)' }}>€{(it.price * (it.qty ?? 1)).toFixed(2)}</span>
                    )}
                  </div>
                ))}
                {o.status === 'pending' && (
                  <div style={{ fontSize: '.72rem', color: 'rgba(245,200,66,.85)', background: 'rgba(245,200,66,.06)', border: '1px solid rgba(245,200,66,.22)', borderRadius: 10, padding: '9px 11px', lineHeight: 1.5 }}>
                    💳 Completa il pagamento in chat: l’ordine parte appena lo riceviamo.
                  </div>
                )}
                <button onClick={() => openTelegram(`https://t.me/magichous8?text=${encodeURIComponent(`Ciao! Ho una domanda sull'ordine ${o.id}`)}`)} style={{
                  marginTop: 2, padding: '10px', borderRadius: 10, fontFamily: 'inherit', fontWeight: 700, fontSize: '.8rem', cursor: 'pointer',
                  background: 'rgba(59,130,246,.12)', border: '1px solid rgba(59,130,246,.35)', color: '#7ec8f8',
                }}>💬 Assistenza su questo ordine</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
