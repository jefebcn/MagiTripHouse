'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Claim {
  id: string; userHandle: string; partnerOrder: string; note: string | null
  status: 'pending' | 'approved' | 'rejected'; code: string | null; createdAt: string; processedAt: string | null
}

const STATUS: Record<Claim['status'], { label: string; color: string }> = {
  pending:  { label: '⏳ Da verificare', color: 'var(--gold)' },
  approved: { label: '✅ Approvata',     color: 'var(--green)' },
  rejected: { label: '✕ Rifiutata',      color: 'var(--red)' },
}

export default function AdminPartner() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    const res = await fetch('/api/admin/partner-claims')
    if (res.ok) setClaims(await res.json())
  }
  useEffect(() => { load() }, [])

  async function act(c: Claim, action: 'approve' | 'reject') {
    if (action === 'reject' && !confirm(`Rifiutare la richiesta di @${c.userHandle}?`)) return
    setBusy(c.id)
    const res = await fetch('/api/admin/partner-claims', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, action }),
    })
    const data = await res.json().catch(() => ({}))
    setBusy(null)
    setMsg(res.ok ? (action === 'approve' ? `✅ Coupon ${data.code} inviato a @${c.userHandle}` : '✅ Richiesta rifiutata') : `❌ ${data.error ?? 'Errore'}`)
    setTimeout(() => setMsg(''), 4000)
    load()
  }

  const pending = claims.filter(c => c.status === 'pending')
  const done = claims.filter(c => c.status !== 'pending')

  const card = (c: Claim) => (
    <div key={c.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800 }}>@{c.userHandle}</span>
        <span style={{ fontSize: '.72rem', fontWeight: 700, color: STATUS[c.status].color }}>{STATUS[c.status].label}</span>
        <span style={{ marginLeft: 'auto', fontSize: '.7rem', color: 'var(--muted)' }}>
          {new Date(c.createdAt).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div style={{ fontSize: '.8rem', marginTop: 6 }}>
        Ordine KratosLabs: <strong style={{ fontFamily: 'monospace', color: '#a5b4fc' }}>{c.partnerOrder}</strong>
      </div>
      {c.note && <div style={{ fontSize: '.74rem', color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>{c.note}</div>}
      {c.code && <div style={{ fontSize: '.76rem', marginTop: 6 }}>Coupon: <strong style={{ fontFamily: 'monospace', color: 'var(--gold)' }}>{c.code}</strong></div>}
      {c.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button disabled={busy === c.id} onClick={() => act(c, 'approve')} style={{
            flex: 1, padding: '10px', borderRadius: 10, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer',
            background: 'rgba(61,255,110,.15)', border: '1px solid rgba(61,255,110,.5)', color: 'var(--green)',
          }}>{busy === c.id ? '…' : '✅ Verificato · invia coupon'}</button>
          <button disabled={busy === c.id} onClick={() => act(c, 'reject')} style={{
            padding: '10px 14px', borderRadius: 10, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer',
            background: 'rgba(232,59,59,.1)', border: '1px solid rgba(232,59,59,.3)', color: 'var(--red)',
          }}>Rifiuta</button>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Link href="/admin" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '1.2rem' }}>‹</Link>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem' }}>🏆 Premi partner</span>
      </div>
      <div style={{ fontSize: '.8rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: 18 }}>
        I clienti inseriscono il numero d’ordine fatto su KratosLabs. Controlla che l’ordine esista e sia pagato, poi approva:
        il cliente riceve un coupon personale −15% (max €20), monouso, valido 30 giorni. Ogni ordine KratosLabs vale una sola volta e ogni cliente ha un solo premio.
      </div>
      {msg && <div style={{ fontSize: '.85rem', marginBottom: 12, color: msg.startsWith('✅') ? 'var(--green)' : 'var(--red)' }}>{msg}</div>}

      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', marginBottom: 10 }}>Da verificare ({pending.length})</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {pending.length ? pending.map(card) : <div style={{ fontSize: '.8rem', color: 'var(--muted)' }}>Nessuna richiesta in attesa.</div>}
      </div>

      {done.length > 0 && (
        <>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', marginBottom: 10 }}>Storico ({done.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{done.map(card)}</div>
        </>
      )}
    </div>
  )
}
