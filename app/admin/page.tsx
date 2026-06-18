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
  grams: { total: number; today: number; week: number; month: number; year: number }
  productStats: Array<{ name: string; grams: number; revenue: number; qty: number; ordersCount: number; avgPricePerGram: number }>
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'In attesa',  color: 'var(--orange)', bg: 'rgba(255,107,53,.12)'  },
  shipped:   { label: 'Spedito',    color: 'var(--blue)',   bg: 'rgba(59,130,246,.12)'  },
  delivered: { label: 'Consegnato', color: 'var(--green)',  bg: 'rgba(61,255,110,.12)'  },
}

const SECTIONS = [
  { href: '/admin/products',              icon: '📦', label: 'Prodotti'  },
  { href: '/admin/orders',                icon: '📋', label: 'Ordini'    },
  { href: '/admin/products?category=combo', icon: '🔥', label: 'Combo'  },
  { href: '/admin/news',                  icon: '📢', label: 'Novità'    },
  { href: '/admin/members',               icon: '👥', label: 'Membri'    },
  { href: '/admin/affiliates',            icon: '🤝', label: 'Affiliati' },
]

function fmt(n: number) {
  if (n >= 1000) return `€${(n / 1000).toFixed(1)}k`
  return `€${n.toFixed(2)}`
}

function fmtG(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(2)} kg`
  return `${n % 1 === 0 ? n : n.toFixed(1)} g`
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [importState, setImportState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  async function runImport() {
    setImportState('loading')
    try {
      const res = await fetch('/api/admin/import-catalog', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setImportResult({ created: data.created, skipped: data.skipped })
        setImportState('done')
      } else {
        setImportState('error')
      }
    } catch {
      setImportState('error')
    }
  }

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

      {/* Grams & Revenue per product */}
      {stats && (
        <div style={{ marginBottom: 16 }}>

          {/* Header + totals */}
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.85rem', color: 'var(--muted)', letterSpacing: '.5px', marginBottom: 8 }}>⚖️ PRODOTTI VENDUTI</div>

          {/* 4 grams KPI chips */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
            {([
              { label: 'Oggi',  g: stats.grams.today,  },
              { label: '7 gg',  g: stats.grams.week,   },
              { label: '30 gg', g: stats.grams.month,  },
              { label: 'Anno',  g: stats.grams.year,   },
            ]).map(k => (
              <div key={k.label} style={{
                background: 'rgba(61,255,110,.04)', border: '1px solid rgba(61,255,110,.15)',
                borderRadius: 10, padding: '8px 4px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '.8rem', fontWeight: 800, color: 'var(--green)', fontFamily: "'Fredoka One', cursive", lineHeight: 1.1 }}>{fmtG(k.g)}</div>
                <div style={{ fontSize: '.52rem', color: 'var(--muted)', marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Summary bar: total grams + total revenue */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8,
          }}>
            <div style={{
              background: 'rgba(61,255,110,.05)', border: '1px solid rgba(61,255,110,.2)',
              borderRadius: 10, padding: '10px 12px',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              <div style={{ fontSize: '.58rem', color: 'var(--muted)' }}>Totale grammi mossi</div>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.15rem', color: 'var(--green)' }}>{fmtG(stats.grams.total)}</div>
            </div>
            <div style={{
              background: 'rgba(245,200,66,.05)', border: '1px solid rgba(245,200,66,.2)',
              borderRadius: 10, padding: '10px 12px',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              <div style={{ fontSize: '.58rem', color: 'var(--muted)' }}>Fatturato prodotti</div>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.15rem', color: 'var(--gold)' }}>
                {fmt(stats.productStats.reduce((s, p) => s + p.revenue, 0))}
              </div>
            </div>
          </div>

          {/* Per-product cards */}
          {stats.productStats.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.productStats.map((p, i) => {
                const gramPct = stats.grams.total > 0 ? (p.grams / stats.grams.total) * 100 : 0
                const totalRev = stats.productStats.reduce((s, x) => s + x.revenue, 0)
                const revPct = totalRev > 0 ? (p.revenue / totalRev) * 100 : 0
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                return (
                  <div key={p.name} style={{
                    background: 'var(--card)',
                    border: i === 0 ? '1px solid rgba(245,200,66,.35)' : '1px solid var(--border)',
                    borderRadius: 12, padding: '11px 13px',
                  }}>
                    {/* Product name row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
                      <div style={{ fontSize: '.72rem', fontWeight: 800, color: i < 3 ? 'var(--gold)' : 'var(--muted)', minWidth: 18 }}>{medal ?? `${i + 1}`}</div>
                      <div style={{ flex: 1, fontSize: '.8rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: '.62rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{p.ordersCount} ordini</div>
                    </div>

                    {/* 4 metrics row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5, marginBottom: 8 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '.78rem', fontWeight: 800, color: 'var(--green)' }}>{fmtG(p.grams)}</div>
                        <div style={{ fontSize: '.52rem', color: 'var(--muted)', marginTop: 1 }}>grammi</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '.78rem', fontWeight: 800, color: 'var(--gold)' }}>{fmt(p.revenue)}</div>
                        <div style={{ fontSize: '.52rem', color: 'var(--muted)', marginTop: 1 }}>fatturato</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '.78rem', fontWeight: 800, color: 'var(--text)' }}>×{p.qty}</div>
                        <div style={{ fontSize: '.52rem', color: 'var(--muted)', marginTop: 1 }}>venduti</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '.78rem', fontWeight: 800, color: 'rgba(150,220,255,.9)' }}>
                          {p.avgPricePerGram > 0 ? `€${p.avgPricePerGram.toFixed(2)}` : '—'}
                        </div>
                        <div style={{ fontSize: '.52rem', color: 'var(--muted)', marginTop: 1 }}>€/g</div>
                      </div>
                    </div>

                    {/* Dual progress bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontSize: '.5rem', color: 'var(--muted)', width: 30 }}>⚖️ {gramPct.toFixed(0)}%</div>
                        <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${gramPct}%`, background: 'linear-gradient(90deg,var(--green),var(--green2))', borderRadius: 2, transition: 'width .4s' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ fontSize: '.5rem', color: 'var(--muted)', width: 30 }}>💶 {revPct.toFixed(0)}%</div>
                        <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${revPct}%`, background: 'linear-gradient(90deg,var(--gold),#f5c842cc)', borderRadius: 2, transition: 'width .4s' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Navigation grid */}
      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.85rem', color: 'var(--muted)', letterSpacing: '.5px', marginBottom: 8 }}>SEZIONI</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
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

      {/* Import catalog */}
      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.85rem', color: 'var(--muted)', letterSpacing: '.5px', marginBottom: 8 }}>STRUMENTI</div>
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '14px 16px',
      }}>
        <div style={{ fontSize: '.8rem', fontWeight: 700, marginBottom: 4 }}>📥 Importa catalogo GFZ</div>
        <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginBottom: 10 }}>
          Aggiunge ~45 prodotti dal catalogo fornitore come bozze nascoste. Sicuro da rieseguire (salta i duplicati).
        </div>
        <button
          onClick={runImport}
          disabled={importState === 'loading'}
          style={{
            width: '100%', padding: '10px', borderRadius: 10,
            fontFamily: 'inherit', fontWeight: 700, fontSize: '.85rem', cursor: importState === 'loading' ? 'not-allowed' : 'pointer',
            background: importState === 'done' ? 'rgba(61,255,110,.12)' : importState === 'error' ? 'rgba(255,80,80,.12)' : 'rgba(245,200,66,.1)',
            border: importState === 'done' ? '1.5px solid rgba(61,255,110,.5)' : importState === 'error' ? '1.5px solid rgba(255,80,80,.5)' : '1.5px solid rgba(245,200,66,.4)',
            color: importState === 'done' ? 'var(--green)' : importState === 'error' ? '#ff5050' : 'var(--gold)',
          }}
        >
          {importState === 'loading' ? '⏳ Importazione...' :
           importState === 'done' ? `✅ Fatto — ${importResult?.created} creati, ${importResult?.skipped} saltati` :
           importState === 'error' ? '❌ Errore — riprova' :
           '📥 Avvia importazione'}
        </button>
      </div>
    </div>
  )
}
