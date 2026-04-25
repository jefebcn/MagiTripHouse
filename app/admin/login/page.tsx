'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', { username, password, redirect: false })
    setLoading(false)
    if (res?.ok) {
      router.push('/admin')
    } else {
      setError('Credenziali non valide')
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--bg2)', borderRadius: 'var(--radius)',
        border: '1px solid rgba(61,255,110,.2)', padding: '32px 24px',
        boxShadow: '0 0 40px rgba(0,0,0,.6)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔐</div>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.4rem', letterSpacing: '.3px' }}>
            Admin Panel
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '.8rem', marginTop: 4 }}>
            MagiTripHouse
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
                padding: '11px 14px', color: 'var(--text)', fontSize: '.9rem', fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
                padding: '11px 14px', color: 'var(--text)', fontSize: '.9rem', fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--red)', fontSize: '.82rem', textAlign: 'center' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="checkout-btn"
            style={{ marginTop: 4 }}
          >
            {loading ? 'Accesso...' : '🔓 Accedi'}
          </button>
        </form>
      </div>
    </div>
  )
}
