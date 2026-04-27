'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface UserRow {
  id: string
  name: string
  handle: string
  role: string
  avatarUrl: string | null
  createdAt: string
  inChannel: boolean
  activity: {
    lastSeen: string
    loginCount: number
    totalMinutes: number
  } | null
}

function formatLastSeen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 2) return 'Ora'
  if (m < 60) return `${m}m fa`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h fa`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}g fa`
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function Avatar({ user }: { user: UserRow }) {
  const initial = user.name[0]?.toUpperCase() ?? '?'
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', overflow: 'hidden',
        background: user.role === 'admin'
          ? 'linear-gradient(135deg,#f5c842,#e0a020)'
          : 'linear-gradient(135deg,var(--green),var(--green2))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.15rem', fontWeight: 800, color: '#000',
        boxShadow: user.role === 'admin' ? '0 0 10px rgba(245,200,66,.4)' : '0 0 8px rgba(61,255,110,.25)',
      }}>
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : initial}
      </div>
      {user.inChannel && (
        <div style={{
          position: 'absolute', bottom: -1, right: -1,
          width: 14, height: 14, borderRadius: '50%',
          background: 'var(--green)', border: '2px solid var(--bg2)',
          fontSize: '.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>📡</div>
      )}
    </div>
  )
}

export default function AdminMembers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [channelCount, setChannelCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Reset state
  const [resetHandle, setResetHandle] = useState<string | null>(null)
  const [resetPwd, setResetPwd] = useState('')
  const [resetStatus, setResetStatus] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  useEffect(() => {
    fetch('/api/channel/members')
      .then(r => r.json())
      .then(d => {
        setUsers(d.users ?? [])
        setChannelCount(d.channelCount ?? 0)
        setTotal(d.total ?? 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleReset(handle: string) {
    if (resetPwd.length < 6) { setResetStatus('Min. 6 caratteri'); return }
    setResetLoading(true); setResetStatus('')
    const res = await fetch('/api/users/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle, newPassword: resetPwd }),
    })
    setResetLoading(false)
    if (res.ok) {
      setResetStatus('✅ Password resettata')
      setTimeout(() => { setResetHandle(null); setResetPwd(''); setResetStatus('') }, 1500)
    } else { setResetStatus('❌ Errore') }
  }

  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.handle.toLowerCase().includes(search.toLowerCase())
  )

  const iStyle: React.CSSProperties = {
    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '10px 12px', color: 'var(--text)', fontSize: '.88rem', fontFamily: 'inherit',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/admin" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '1.2rem' }}>‹</Link>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem' }}>👥 Utenti</span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Registrati', value: total, color: '#3b82f6' },
          { label: 'Nel canale', value: channelCount, color: 'var(--green)' },
          { label: 'Con attività', value: users.filter(u => u.activity).length, color: 'var(--gold)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '12px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '9px 13px', marginBottom: 14,
      }}>
        <span style={{ opacity: .5, fontSize: '.9rem' }}>🔍</span>
        <input
          placeholder="Cerca utente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: '.85rem', fontFamily: 'inherit' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>Caricamento...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontSize: '.88rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
          Nessun utente trovato
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(u => (
            <div key={u.id} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 14, overflow: 'hidden',
            }}>
              {/* Row */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', cursor: 'pointer' }}
                onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
              >
                <Avatar user={u} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.name}
                    </span>
                    {u.role === 'admin' && (
                      <span style={{
                        fontSize: '.58rem', fontWeight: 700, letterSpacing: '.3px',
                        background: 'rgba(245,200,66,.15)', border: '1px solid rgba(245,200,66,.4)',
                        color: '#f5c842', borderRadius: 20, padding: '1px 6px',
                      }}>ADMIN</span>
                    )}
                  </div>
                  <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 1 }}>
                    @{u.handle}
                    {u.activity && (
                      <span style={{ color: 'rgba(106,138,106,.7)', marginLeft: 6 }}>
                        · {formatLastSeen(u.activity.lastSeen)}
                      </span>
                    )}
                  </div>
                </div>

                <span style={{ color: 'var(--muted)', fontSize: '.8rem', transition: '.2s', transform: expandedId === u.id ? 'rotate(90deg)' : 'none' }}>›</span>
              </div>

              {/* Expanded detail */}
              {expandedId === u.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {/* Activity stats */}
                  {u.activity ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                      {[
                        { label: 'Sessioni', value: u.activity.loginCount, icon: '🔑' },
                        { label: 'Tempo', value: formatTime(u.activity.totalMinutes), icon: '⏱' },
                        { label: 'Visto', value: formatLastSeen(u.activity.lastSeen), icon: '👁' },
                      ].map(s => (
                        <div key={s.label} style={{
                          background: 'var(--bg3)', borderRadius: 10, padding: '8px 6px', textAlign: 'center',
                        }}>
                          <div style={{ fontSize: '.9rem', marginBottom: 2 }}>{s.icon}</div>
                          <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--text)' }}>{s.value}</div>
                          <div style={{ fontSize: '.6rem', color: 'var(--muted)' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '.75rem', color: 'var(--muted)', textAlign: 'center', padding: '4px 0' }}>
                      Nessuna attività registrata
                    </div>
                  )}

                  {/* Info row */}
                  <div style={{ fontSize: '.7rem', color: 'var(--muted)', display: 'flex', gap: 12 }}>
                    <span>📅 Iscritto {new Date(u.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span>{u.inChannel ? '📡 Nel canale' : '○ Non nel canale'}</span>
                  </div>

                  {/* Reset pwd */}
                  {resetHandle === u.handle ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input
                        type="password"
                        placeholder="Nuova password (min. 6 caratteri)"
                        value={resetPwd}
                        onChange={e => setResetPwd(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleReset(u.handle)}
                        style={iStyle}
                      />
                      {resetStatus && (
                        <div style={{ fontSize: '.78rem', color: resetStatus.startsWith('✅') ? 'var(--green)' : 'var(--red)' }}>
                          {resetStatus}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleReset(u.handle)}
                          disabled={resetLoading || resetPwd.length < 6}
                          style={{
                            flex: 1, padding: '9px', borderRadius: 10, fontFamily: 'inherit',
                            fontWeight: 700, fontSize: '.82rem', cursor: 'pointer',
                            background: 'rgba(61,255,110,.15)', border: '1px solid rgba(61,255,110,.4)', color: 'var(--green)',
                          }}
                        >{resetLoading ? '...' : '✓ Conferma reset'}</button>
                        <button
                          onClick={() => { setResetHandle(null); setResetPwd(''); setResetStatus('') }}
                          style={{
                            padding: '9px 14px', borderRadius: 10, fontFamily: 'inherit',
                            background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer',
                          }}
                        >Annulla</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setResetHandle(u.handle); setResetPwd(''); setResetStatus('') }}
                      style={{
                        background: 'rgba(245,200,66,.08)', border: '1px solid rgba(245,200,66,.25)',
                        borderRadius: 8, padding: '8px 12px', color: '#f5c842', width: '100%',
                        fontFamily: 'inherit', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer',
                      }}
                    >🔑 Reset password</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
