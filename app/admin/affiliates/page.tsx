'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Affiliate {
  id: string; username: string; code: string;
  referredBy?: string; referredAt?: string; joinedAt: string;
}

export default function AdminAffiliates() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/affiliates')
      .then((r) => r.json())
      .then((data) => { setAffiliates(data); setLoading(false) })
  }, [])

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/admin" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '1.2rem' }}>‹</Link>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem' }}>👥 Affiliati ({affiliates.length})</span>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>Caricamento...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {affiliates.map((a) => (
            <div key={a.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '.88rem' }}>@{a.username}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 2 }}>
                  Codice: <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{a.code}</span>
                  {a.referredBy && <span> · Invitato da: <strong>{a.referredBy}</strong></span>}
                </div>
                <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginTop: 2 }}>
                  Iscritto: {new Date(a.joinedAt).toLocaleDateString('it-IT')}
                </div>
              </div>
              <a
                href={`https://t.me/${a.username}`}
                target="_blank"
                rel="noopener"
                style={{
                  background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.3)',
                  color: 'var(--blue)', borderRadius: 8, padding: '6px 10px',
                  fontSize: '.72rem', fontWeight: 700, textDecoration: 'none',
                }}
              >
                💬
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
