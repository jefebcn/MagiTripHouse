'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'

interface Stats {
  revenue: { today: number; week: number; month: number; total: number }
  orders: { total: number; pending: number; shipped: number; delivered: number }
  users: { total: number; today: number; week: number }
  recentOrders: Array<{ id: string; userId: string; total: number; status: string; createdAt: string }>
  topProducts: Array<{ name: string; count: number }>
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'In attesa',  color: 'var(--orange)', bg: 'rgba(255,107,53,.12)'  },
  shipped:   { label: 'Spedito',    color: 'var(--blue)',   bg: 'rgba(59,130,246,.12)'  },
  delivered: { label: 'Consegnato', color: 'var(--green)',  bg: 'rgba(61,255,110,.12)'  },
}

const SECTIONS = [
  { href: '/admin/products',   icon: '📦', label: 'Prodotti'  },
  { href: '/admin/orders',     icon: '📋', label: 'Ordini'    },
  { href: '/admin/news',       icon: '📢', label: 'Novità'    },
  { href: '/admin/members',    icon: '👥', label: 'Membri'    },
  { href: '/admin/affiliates', icon: '🤝', label: 'Affiliati' },
]

function fmt(n: number) {
  if (n >= 1000) return `€${(n / 1000).toFixed(1)}k`
  return `€${n.toFixed(2)}`
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.4rem' }}>⚙️ Admin</div>
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          style={{
            background: 'var(--bg3)', border: '1px solid var(--border)',
            color: 'var(--muted)', borderRadius: 8, padding: '6px 14px',
            fontSize: '.78rem', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >Esci</button>
      </div>
      <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 20, textTransform: 'capitalize' }}>{today}</div>

      {/* Revenue KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        {([
          { label: 'Oggi',      value: stats ? fmt(stats.revenue.today) : '—' },
          { label: 'Settimana', value: stats ? fmt(stats.revenue.week)  : '—' },
          { label: 'Mese',      value: stats ? fmt(stats.revenue.month) : '—' },
        ] as const).map(k => (
          <div key={k.label} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '12px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--green)', fontFamily: "'Fredoka One', cursive" }}>{k.value}</div>
            <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Total revenue banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(61,255,110,.06), rgba(245,200,66,.06))',
        border: '1px solid rgba(245,200,66,.2)', borderRadius: 12,
        padding: '10px 14px', marginBottom: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>Fatturato totale</span>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem', color: 'var(--gold)' }}>
          {stats ? fmt(stats.revenue.total) : '—'}
        </span>
      </div>

      {/* Quick stats: orders + users */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {([
          { icon: '🟡', value: stats?.orders.pending,   label: 'In attesa', color: 'var(--orange)', bg: 'rgba(255,107,53,.08)', border: 'rgba(255,107,53,.2)' },
          { icon: '🔵', value: stats?.orders.shipped,   label: 'Spediti',   color: 'var(--blue)',   bg: 'rgba(59,130,246,.08)', border: 'rgba(59,130,246,.2)' },
          { icon: '👤', value: stats?.users.week,       label: 'Nuovi (7g)',color: 'var(--blue)',   bg: 'rgba(59,130,246,.08)', border: 'rgba(59,130,246,.2)' },
        ] as const).map(s => (
          <div key={s.label} style={{
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: 12, padding: '10px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '.9rem', marginBottom: 3 }}>{s.icon}</div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: s.color }}>{s.value ?? '—'}</div>
            <div style={{ fontSize: '.58rem', color: 'var(--muted)', marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.85rem', color: 'var(--muted)', letterSpacing: '.5px' }}>ULTIMI ORDINI</div>
          <Link href="/admin/orders" style={{ fontSize: '.7rem', color: 'var(--green)', textDecoration: 'none' }}>Tutti →</Link>
        </div>
        {!stats ? (
          <div style={{ color: 'var(--muted)', fontSize: '.8rem' }}>Caricamento...</div>
        ) : stats.recentOrders.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: '.8rem' }}>Nessun ordine ancora</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stats.recentOrders.map(o => {
              const meta = STATUS_META[o.status] ?? STATUS_META.pending
              return (
                <div key={o.id} style={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 12px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--green)', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.id}</div>
                    <div style={{ fontSize: '.62rem', color: 'var(--muted)', marginTop: 1 }}>
                      {o.userId && o.userId !== 'anonymous' ? `@${o.userId}` : 'Anonimo'} · {new Date(o.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  <div style={{ fontSize: '.9rem', fontWeight: 800, color: 'var(--gold)', fontFamily: "'Fredoka One', cursive", whiteSpace: 'nowrap' }}>€{o.total.toFixed(2)}</div>
                  <div style={{
                    fontSize: '.6rem', fontWeight: 700,
                    background: meta.bg, color: meta.color,
                    border: `1px solid ${meta.color}55`,
                    borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap',
                  }}>{meta.label}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Top products */}
      {stats && stats.topProducts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.85rem', color: 'var(--muted)', letterSpacing: '.5px', marginBottom: 8 }}>TOP PRODOTTI</div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {stats.topProducts.map((p, i) => (
              <div key={p.name} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 13px',
                borderBottom: i < stats.topProducts.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ fontSize: '.75rem', fontWeight: 800, color: i === 0 ? 'var(--gold)' : 'var(--muted)', width: 16, textAlign: 'center' }}>{i + 1}</div>
                <div style={{ flex: 1, fontSize: '.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: '.7rem', color: 'var(--muted)', fontWeight: 700 }}>×{p.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation grid */}
      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.85rem', color: 'var(--muted)', letterSpacing: '.5px', marginBottom: 8 }}>SEZIONI</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {SECTIONS.map(s => (
          <Link key={s.href} href={s.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            }}>
              <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
              <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.9rem' }}>{s.label}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: '.8rem' }}>›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
