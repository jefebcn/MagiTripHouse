'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Order {
  id: string; userId: string; status: string; total: number;
  items: { id: string; label: string; price: number; qty: number }[];
  note?: string; createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: '🟡 In attesa',  color: 'var(--orange)' },
  shipped:   { label: '🔵 Spedito',    color: 'var(--blue)' },
  delivered: { label: '🟢 Consegnato', color: 'var(--green)' },
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch('/api/orders')
    const data = await res.json()
    setOrders(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function updateStatus(id: string, status: string) {
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o))
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/admin" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '1.2rem' }}>‹</Link>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem' }}>📋 Ordini</span>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>Caricamento...</div>
      ) : !orders.length ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 48 }}>Nessun ordine</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orders.map((o) => (
            <div key={o.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.9rem', color: 'var(--green)' }}>{o.id}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 2 }}>
                    👤 {o.userId} · {new Date(o.createdAt).toLocaleDateString('it-IT')}
                  </div>
                </div>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.25rem', color: 'var(--gold)' }}>
                  €{o.total.toFixed(2)}
                </div>
              </div>

              <div style={{ fontSize: '.76rem', color: 'var(--muted)' }}>
                {Array.isArray(o.items) ? o.items.map((x) => `${x.label} ×${x.qty}`).join(', ') : String(o.items)}
              </div>

              {o.note && (
                <div style={{ fontSize: '.73rem', color: 'var(--muted)', background: 'var(--bg)', borderRadius: 7, padding: '7px 10px', borderLeft: '2px solid var(--gold)' }}>
                  {o.note}
                </div>
              )}

              {/* Status buttons */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(STATUS_LABELS).map(([s, { label, color }]) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(o.id, s)}
                    style={{
                      borderRadius: 20, padding: '5px 11px', fontSize: '.7rem', fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit', border: '1px solid',
                      background: o.status === s ? `${color}22` : 'var(--bg)',
                      color: o.status === s ? color : 'var(--muted)',
                      borderColor: o.status === s ? color : 'var(--border)',
                    }}
                  >
                    {label}
                  </button>
                ))}
                <a
                  href={`https://t.me/${o.userId}`}
                  target="_blank"
                  rel="noopener"
                  style={{
                    borderRadius: 20, padding: '5px 11px', fontSize: '.7rem', fontWeight: 700,
                    background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.3)',
                    color: 'var(--blue)', textDecoration: 'none',
                  }}
                >
                  💬 Contatta
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
