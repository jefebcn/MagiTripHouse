'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Order {
  id: string
  userId: string
  status: string
  total: number
  items: { id: string; label: string; price: number; qty: number }[]
  note?: string
  createdAt: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:   { label: '🟡 In attesa',  color: 'var(--orange)' },
  shipped:   { label: '🔵 Spedito',    color: 'var(--blue)'   },
  delivered: { label: '🟢 Consegnato', color: 'var(--green)'  },
}

const TABS = [
  { key: 'all',       label: 'Tutti'      },
  { key: 'pending',   label: 'In attesa'  },
  { key: 'shipped',   label: 'Spediti'    },
  { key: 'delivered', label: 'Consegnati' },
]

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/orders')
      .then(r => r.json())
      .then(data => { setOrders(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function updateStatus(id: string, status: string) {
    await fetch('/api/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  const counts: Record<string, number> = {
    all:       orders.length,
    pending:   orders.filter(o => o.status === 'pending').length,
    shipped:   orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  }

  const filtered = orders.filter(o => {
    if (tab !== 'all' && o.status !== tab) return false
    if (search) {
      const q = search.toLowerCase()
      return o.userId.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
    }
    return true
  })

  const totalRevenue = filtered.reduce((sum, o) => sum + o.total, 0)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link href="/admin" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '1.2rem' }}>‹</Link>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem' }}>📋 Ordini</span>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.15rem', color: 'var(--gold)' }}>€{totalRevenue.toFixed(2)}</div>
          <div style={{ fontSize: '.6rem', color: 'var(--muted)' }}>{filtered.length} ordini</div>
        </div>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '8px 12px', marginBottom: 10,
      }}>
        <span style={{ opacity: .5, fontSize: '.85rem' }}>🔍</span>
        <input
          placeholder="Cerca utente o ID ordine..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '.82rem', fontFamily: 'inherit' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, fontSize: '.85rem' }}>✕</button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flexShrink: 0, borderRadius: 20, padding: '5px 12px',
              fontSize: '.74rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', border: '1px solid',
              background: tab === t.key ? 'rgba(61,255,110,.12)' : 'var(--bg3)',
              color: tab === t.key ? 'var(--green)' : 'var(--muted)',
              borderColor: tab === t.key ? 'rgba(61,255,110,.35)' : 'var(--border)',
            }}
          >
            {t.label}{counts[t.key] > 0 && <span style={{ opacity: .65, marginLeft: 4 }}>({counts[t.key]})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>Caricamento...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 48, fontSize: '.85rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
          Nessun ordine trovato
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(o => (
            <div key={o.id} style={{
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 14,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: '.78rem', color: 'var(--green)', fontWeight: 700 }}>{o.id}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 2 }}>
                    👤 {o.userId && o.userId !== 'anonymous' ? `@${o.userId}` : 'Anonimo'} · {new Date(o.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.2rem', color: 'var(--gold)' }}>
                  €{o.total.toFixed(2)}
                </div>
              </div>

              <div style={{ fontSize: '.76rem', color: 'var(--muted)' }}>
                {Array.isArray(o.items) ? o.items.map(x => `${x.label} ×${x.qty}`).join(', ') : String(o.items)}
              </div>

              {o.note && (
                <div style={{ fontSize: '.73rem', color: 'var(--muted)', background: 'var(--bg)', borderRadius: 7, padding: '7px 10px', borderLeft: '2px solid var(--gold)' }}>
                  📝 {o.note}
                </div>
              )}

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
                  >{label}</button>
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
                >💬 Contatta</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
