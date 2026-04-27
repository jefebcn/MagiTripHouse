'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Member { id: string; handle: string; name: string; joinedAt: string }

export default function AdminMembers() {
  const [members, setMembers] = useState<Member[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [loading, setLoading] = useState(true)

  // Reset state per row
  const [resetHandle, setResetHandle] = useState<string | null>(null)
  const [resetPwd, setResetPwd] = useState('')
  const [resetStatus, setResetStatus] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  useEffect(() => {
    fetch('/api/channel/members')
      .then(r => r.json())
      .then(d => { setMembers(d.members ?? []); setTotalUsers(d.total ?? 0); setLoading(false) })
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
    } else {
      setResetStatus('❌ Errore')
    }
  }

  const iStyle: React.CSSProperties = {
    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '10px 12px', color: 'var(--text)', fontSize: '.88rem', fontFamily: 'inherit',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/admin" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '1.2rem' }}>‹</Link>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem' }}>👥 Membri del Canale</span>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Entrati nel canale', value: members.length, color: 'var(--green)' },
          { label: 'Utenti registrati', value: totalUsers, color: '#3b82f6' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '14px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>Caricamento...</div>
      ) : members.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontSize: '.88rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
          Nessun membro ancora
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map(m => (
            <div key={m.id} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--green)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1.1rem', fontWeight: 800, color: '#000',
                }}>{m.name[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{m.name}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>
                    @{m.handle} · entrato il {new Date(m.joinedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <button
                  onClick={() => { setResetHandle(resetHandle === m.handle ? null : m.handle); setResetPwd(''); setResetStatus('') }}
                  style={{
                    background: 'rgba(245,200,66,.08)', border: '1px solid rgba(245,200,66,.3)',
                    borderRadius: 8, padding: '5px 10px', color: '#f5c842',
                    fontFamily: 'inherit', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >🔑 Reset pwd</button>
              </div>

              {resetHandle === m.handle && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    type="password"
                    placeholder="Nuova password (min. 6 caratteri)"
                    value={resetPwd}
                    onChange={e => setResetPwd(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleReset(m.handle)}
                    style={iStyle}
                  />
                  {resetStatus && (
                    <div style={{ fontSize: '.78rem', color: resetStatus.startsWith('✅') ? 'var(--green)' : 'var(--red)' }}>
                      {resetStatus}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleReset(m.handle)}
                      disabled={resetLoading || resetPwd.length < 6}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 10, fontFamily: 'inherit',
                        fontWeight: 700, fontSize: '.85rem', cursor: 'pointer',
                        background: 'rgba(61,255,110,.15)', border: '1px solid rgba(61,255,110,.4)', color: 'var(--green)',
                      }}
                    >{resetLoading ? '...' : '✓ Conferma reset'}</button>
                    <button
                      onClick={() => { setResetHandle(null); setResetPwd(''); setResetStatus('') }}
                      style={{
                        padding: '10px 14px', borderRadius: 10, fontFamily: 'inherit',
                        background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer',
                      }}
                    >Annulla</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
