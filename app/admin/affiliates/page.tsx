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
  tier: string
  commissionRate: number
  commissionEarned: number
  commissionPaid: number
  balance: number
  referralCount: number
  referralRevenue: number
}

interface Commissions {
  totalEarned: number
  totalPaid: number
  totalPending: number
}

const TIER_META: Record<string, { emoji: string; color: string; bg: string; label: string }> = {
  bronze: { emoji: '🥉', label: 'Bronze', color: '#cd7f32', bg: 'rgba(205,127,50,.12)' },
  silver: { emoji: '🥈', label: 'Silver', color: '#a8a9ad', bg: 'rgba(168,169,173,.12)' },
  gold:   { emoji: '🥇', label: 'Gold',   color: '#f5c842', bg: 'rgba(245,200,66,.14)' },
}

export default function AdminAffiliates() {
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([])
  const [commissions, setCommissions] = useState<Commissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'recent' | 'referrals' | 'revenue' | 'earnings'>('referrals')
  const [copied, setCopied] = useState<string | null>(null)

  async function load() {
    try {
      const d = await fetch('/api/admin/stats').then(r => r.json())
      setAffiliates(d.affiliates ?? [])
      setCommissions(d.commissions ?? null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(null), 1500)
  }

  const sorted = [...affiliates].sort((a, b) => {
    if (sort === 'referrals') return b.referralCount - a.referralCount
    if (sort === 'revenue')   return b.referralRevenue - a.referralRevenue
    if (sort === 'earnings')  return b.commissionEarned - a.commissionEarned
    return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
  })

  const topAffiliate = affiliates.reduce((best, a) => a.referralCount > (best?.referralCount ?? -1) ? a : best, null as AffiliateRow | null)

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

      {/* Commission summary */}
      {commissions && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Maturate', value: `€${commissions.totalEarned.toFixed(0)}`, color: 'var(--gold)' },
            { label: 'Pagate', value: `€${commissions.totalPaid.toFixed(0)}`, color: 'var(--green)' },
            { label: 'Da pagare', value: `€${commissions.totalPending.toFixed(0)}`, color: '#ff8c00' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '11px 8px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Referral stats */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Affiliati', value: affiliates.length, color: '#3b82f6' },
            { label: 'Con referral', value: affiliates.filter(a => a.referredBy).length, color: 'var(--green)' },
            { label: 'Rev. referral', value: `€${affiliates.reduce((s, a) => s + a.referralRevenue, 0).toFixed(0)}`, color: 'var(--gold)' },
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

      {/* Top affiliate */}
      {topAffiliate && topAffiliate.referralCount > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,200,66,.08), rgba(61,255,110,.06))',
          border: '1px solid rgba(245,200,66,.25)', borderRadius: 12,
          padding: '10px 14px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: '1.3rem' }}>🏆</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>Top referrer</div>
            <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--gold)' }}>
              @{topAffiliate.username} · {topAffiliate.referralCount} referral
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '.8rem', fontWeight: 800, color: 'var(--gold)' }}>€{topAffiliate.commissionEarned.toFixed(2)}</div>
            <div style={{ fontSize: '.58rem', color: 'var(--muted)' }}>maturato</div>
          </div>
        </div>
      )}


      {/* Sort tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto' }}>
            {([
              { key: 'referrals', label: 'Referral' },
              { key: 'earnings',  label: 'Guadagni' },
              { key: 'revenue',   label: 'Revenue' },
              { key: 'recent',    label: 'Recenti' },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setSort(t.key)}
                style={{
                  flexShrink: 0, borderRadius: 20, padding: '5px 12px',
                  fontSize: '.72rem', fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', border: '1px solid',
                  background: sort === t.key ? 'rgba(245,200,66,.12)' : 'var(--bg3)',
                  color:      sort === t.key ? 'var(--gold)'          : 'var(--muted)',
                  borderColor: sort === t.key ? 'rgba(245,200,66,.35)' : 'var(--border)',
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
              {sorted.map((a, i) => {
                const tierMeta = TIER_META[a.tier] ?? TIER_META.bronze
                return (
                  <div key={a.id} style={{
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '12px 14px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      {sort === 'referrals' && i < 3 && (
                        <div style={{ fontSize: '.8rem', fontWeight: 800, color: 'var(--gold)', marginTop: 2, width: 16, flexShrink: 0 }}>
                          {i + 1}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '.9rem' }}>{tierMeta.emoji}</span>
                          <span style={{ fontWeight: 700, fontSize: '.88rem' }}>@{a.username}</span>
                          <span style={{ fontSize: '.62rem', color: tierMeta.color, background: tierMeta.bg, borderRadius: 20, padding: '1px 7px', fontWeight: 700 }}>{tierMeta.label} {Math.round(a.commissionRate * 100)}%</span>
                        </div>
                        <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: 2 }}>
                          {a.referredBy && <span>Inv. da: <strong>{a.referredBy}</strong> · </span>}
                          {new Date(a.joinedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end', flexShrink: 0 }}>
                        {a.referralCount > 0 && (
                          <div style={{ fontSize: '.62rem', fontWeight: 700, background: 'rgba(61,255,110,.1)', color: 'var(--green)', border: '1px solid rgba(61,255,110,.25)', borderRadius: 20, padding: '2px 8px' }}>
                            {a.referralCount} ref
                          </div>
                        )}
                        {a.commissionEarned > 0 && (
                          <div style={{ fontSize: '.62rem', fontWeight: 700, background: 'rgba(245,200,66,.1)', color: 'var(--gold)', border: '1px solid rgba(245,200,66,.25)', borderRadius: 20, padding: '2px 8px' }}>
                            €{a.commissionEarned.toFixed(2)} mat.
                          </div>
                        )}
                        {a.balance > 0 && (
                          <div style={{ fontSize: '.62rem', fontWeight: 700, background: 'rgba(61,255,110,.08)', color: 'var(--green)', border: '1px solid rgba(61,255,110,.2)', borderRadius: 20, padding: '2px 8px' }}>
                            €{a.balance.toFixed(2)} disp.
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '.82rem', fontWeight: 700, color: 'var(--gold)', background: 'rgba(245,200,66,.08)', border: '1px solid rgba(245,200,66,.2)', borderRadius: 8, padding: '4px 10px', letterSpacing: '1px' }}>
                        {a.code}
                      </div>
                      <button
                        onClick={() => copyCode(a.code)}
                        style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', fontSize: '.7rem', cursor: 'pointer', fontFamily: 'inherit', color: copied === a.code ? 'var(--green)' : 'var(--muted)' }}
                      >{copied === a.code ? '✓' : 'Copia'}</button>
                      <a
                        href={`https://t.me/${a.username}`}
                        target="_blank" rel="noopener"
                        style={{ marginLeft: 'auto', background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.3)', color: 'var(--blue)', borderRadius: 8, padding: '4px 10px', fontSize: '.72rem', fontWeight: 700, textDecoration: 'none' }}
                      >💬</a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
    </div>
  )
}
