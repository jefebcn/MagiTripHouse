'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AffiliateRow {
  id: string
  username: string
  code: string
  referredBy?: string
  referredAt?: string
  joinedAt: string
  referralCount: number
  referralRevenue: number
}

export default function AdminAffiliates() {
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'recent' | 'referrals' | 'revenue'>('referrals')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => { setAffiliates(d.affiliates ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(null), 1500)
  }

  const sorted = [...affiliates].sort((a, b) => {
    if (sort === 'referrals') return b.referralCount - a.referralCount
    if (sort === 'revenue')   return b.referralRevenue - a.referralRevenue
    return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
  })

  const totalReferrals = affiliates.filter(a => a.referredBy).length
  const totalRevenue   = affiliates.reduce((s, a) => s + a.referralRevenue, 0)
  const topAffiliate   = affiliates.reduce((best, a) => a.referralCount > (best?.referralCount ?? -1) ? a : best, null as AffiliateRow | null)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link href="/admin" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '1.2rem' }}>‹</Link>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem' }}>🤝 Affiliati</span>
        <div style={{ marginLeft: 'auto', fontFamily: "'Fredoka One', cursive", fontSize: '1.1rem', color: 'var(--muted)' }}>
          {loading ? '—' : affiliates.length}
        </div>
      </div>

      {/* Stats row */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Totale', value: affiliates.length, color: '#3b82f6' },
            { label: 'Con referral', value: totalReferrals, color: 'var(--green)' },
            { label: 'Fatturato ref.', value: `€${totalRevenue.toFixed(0)}`, color: 'var(--gold)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '11px 8px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Top affiliate highlight */}
      {topAffiliate && topAffiliate.referralCount > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,200,66,.08), rgba(61,255,110,.06))',
          border: '1px solid rgba(245,200,66,.25)', borderRadius: 12,
          padding: '10px 14px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: '1.3rem' }}>🏆</span>
          <div>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>Top referrer</div>
            <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--gold)' }}>
              @{topAffiliate.username} · {topAffiliate.referralCount} referral
            </div>
          </div>
        </div>
      )}

      {/* Sort tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {([
          { key: 'referrals', label: 'Per referral' },
          { key: 'revenue',   label: 'Per fatturato' },
          { key: 'recent',    label: 'Recenti' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setSort(t.key)}
            style={{
              flexShrink: 0, borderRadius: 20, padding: '5px 12px',
              fontSize: '.74rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', border: '1px solid',
              background: sort === t.key ? 'rgba(61,255,110,.12)' : 'var(--bg3)',
              color:      sort === t.key ? 'var(--green)'         : 'var(--muted)',
              borderColor: sort === t.key ? 'rgba(61,255,110,.35)' : 'var(--border)',
            }}
          >{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>Caricamento...</div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 48, fontSize: '.85rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🤝</div>
          Nessun affiliato
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((a, i) => (
            <div key={a.id} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>

                {/* Rank */}
                {sort === 'referrals' && i < 3 && (
                  <div style={{ fontSize: '.8rem', fontWeight: 800, color: ['var(--gold)', 'var(--muted)', 'var(--muted)'][i], marginTop: 2, width: 16, flexShrink: 0, textAlign: 'center' }}>
                    {i + 1}
                  </div>
                )}

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '.88rem' }}>@{a.username}</div>
                  <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: 2 }}>
                    {a.referredBy && <span>Invitato da: <strong>{a.referredBy}</strong> · </span>}
                    {new Date(a.joinedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>

                {/* Stats badges */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                  {a.referralCount > 0 && (
                    <div style={{
                      fontSize: '.65rem', fontWeight: 700,
                      background: 'rgba(61,255,110,.12)', color: 'var(--green)',
                      border: '1px solid rgba(61,255,110,.3)', borderRadius: 20, padding: '2px 8px',
                    }}>{a.referralCount} referral</div>
                  )}
                  {a.referralRevenue > 0 && (
                    <div style={{
                      fontSize: '.65rem', fontWeight: 700,
                      background: 'rgba(245,200,66,.1)', color: 'var(--gold)',
                      border: '1px solid rgba(245,200,66,.25)', borderRadius: 20, padding: '2px 8px',
                    }}>€{a.referralRevenue.toFixed(2)}</div>
                  )}
                </div>
              </div>

              {/* Code + actions row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <div style={{
                  fontFamily: 'monospace', fontSize: '.82rem', fontWeight: 700,
                  color: 'var(--gold)', background: 'rgba(245,200,66,.08)',
                  border: '1px solid rgba(245,200,66,.2)', borderRadius: 8,
                  padding: '4px 10px', letterSpacing: '1px',
                }}>{a.code}</div>
                <button
                  onClick={() => copyCode(a.code)}
                  style={{
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '4px 10px', fontSize: '.7rem',
                    cursor: 'pointer', fontFamily: 'inherit',
                    color: copied === a.code ? 'var(--green)' : 'var(--muted)',
                  }}
                >{copied === a.code ? '✓ Copiato' : 'Copia'}</button>
                <a
                  href={`https://t.me/${a.username}`}
                  target="_blank"
                  rel="noopener"
                  style={{
                    marginLeft: 'auto',
                    background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.3)',
                    color: 'var(--blue)', borderRadius: 8, padding: '4px 10px',
                    fontSize: '.72rem', fontWeight: 700, textDecoration: 'none',
                  }}
                >💬</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
