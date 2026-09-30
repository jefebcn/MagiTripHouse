'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface DiscountCode {
  code: string; percent: number; firstOrderOnly: boolean; showInOffers: boolean; origins: string[]; active: boolean
  expiresAt: string | null; maxUses: number | null; uses: number; note: string | null; createdAt: string
}

const ORIGINS: { key: string; label: string }[] = [
  { key: 'spain',  label: '🇪🇸 Spagna' },
  { key: 'italy',  label: '🇮🇹 Italia' },
  { key: 'pharma', label: '💊 Pharma'  },
  { key: 'meetup', label: '🤝 Meetup'  },
]

export default function AdminDiscounts() {
  const [codes, setCodes] = useState<DiscountCode[]>([])
  const [code, setCode] = useState('')
  const [percent, setPercent] = useState('10')
  const [firstOrderOnly, setFirstOrderOnly] = useState(false)
  const [showInOffers, setShowInOffers] = useState(false)
  const [origins, setOrigins] = useState<string[]>([])
  const [expiresAt, setExpiresAt] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState('')

  const iStyle: React.CSSProperties = {
    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '11px 14px', color: 'var(--text)', fontSize: '.9rem', fontFamily: 'inherit', outline: 'none',
  }

  async function load() {
    const res = await fetch('/api/admin/discounts')
    if (res.ok) setCodes(await res.json())
  }

  useEffect(() => { load() }, [])

  function toggleOrigin(o: string) {
    setOrigins(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o])
  }

  function edit(c: DiscountCode) {
    setCode(c.code); setPercent(String(c.percent)); setFirstOrderOnly(c.firstOrderOnly); setShowInOffers(!!c.showInOffers)
    setOrigins(c.origins); setExpiresAt(c.expiresAt ? c.expiresAt.slice(0, 10) : '')
    setMaxUses(c.maxUses != null ? String(c.maxUses) : ''); setNote(c.note ?? '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/discounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code, percent: Number(percent), firstOrderOnly, showInOffers, origins,
        // fine giornata: il codice vale per tutto il giorno di scadenza
        expiresAt: expiresAt ? `${expiresAt}T23:59:59` : null,
        maxUses: maxUses || null, note,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      setResult(`✅ Codice ${data.code} salvato`)
      setCode(''); setPercent('10'); setFirstOrderOnly(false); setShowInOffers(false); setOrigins([]); setExpiresAt(''); setMaxUses(''); setNote('')
      load()
    } else {
      setResult(`❌ ${data.error ?? 'Errore'}`)
    }
    setTimeout(() => setResult(''), 4000)
  }

  async function toggleActive(c: DiscountCode) {
    const res = await fetch('/api/admin/discounts', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: c.code, active: !c.active }),
    })
    if (res.ok) setCodes(prev => prev.map(x => x.code === c.code ? { ...x, active: !c.active } : x))
  }

  async function handleDelete(c: DiscountCode) {
    if (!confirm(`Eliminare il codice ${c.code}?`)) return
    await fetch('/api/admin/discounts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: c.code }) })
    setCodes(prev => prev.filter(x => x.code !== c.code))
  }

  function status(c: DiscountCode): { label: string; color: string } {
    if (!c.active) return { label: 'Disattivato', color: 'var(--muted)' }
    if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) return { label: 'Scaduto', color: 'var(--red)' }
    if (c.maxUses != null && c.uses >= c.maxUses) return { label: 'Esaurito', color: 'var(--gold)' }
    return { label: 'Attivo', color: 'var(--green)' }
  }

  const chip = (on: boolean): React.CSSProperties => ({
    padding: '7px 12px', borderRadius: 999, fontSize: '.78rem', fontFamily: 'inherit', cursor: 'pointer',
    background: on ? 'rgba(61,255,110,.15)' : 'var(--bg3)',
    border: `1px solid ${on ? 'rgba(61,255,110,.5)' : 'var(--border)'}`,
    color: on ? 'var(--green)' : 'var(--muted)',
  })

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/admin" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '1.2rem' }}>‹</Link>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem' }}>🎟️ Codici sconto</span>
      </div>

      <form onSubmit={handleSave} style={{
        background: 'var(--bg2)', border: '1px solid rgba(61,255,110,.2)',
        borderRadius: 'var(--radius)', padding: 16, marginBottom: 24,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="CODICE (es. ESTATE15)" value={code} required
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} maxLength={32}
            style={{ ...iStyle, flex: 1, letterSpacing: '.05em', fontWeight: 700 }} />
          <div style={{ position: 'relative', width: 96 }}>
            <input type="number" min={1} max={90} step="any" value={percent} required
              onChange={e => setPercent(e.target.value)} style={{ ...iStyle, width: '100%', paddingRight: 28, boxSizing: 'border-box' }} />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>%</span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 6 }}>Valido per (nessuna selezione = tutte le spedizioni)</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ORIGINS.map(o => (
              <button type="button" key={o.key} onClick={() => toggleOrigin(o.key)} style={chip(origins.includes(o.key))}>{o.label}</button>
            ))}
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={firstOrderOnly} onChange={e => setFirstOrderOnly(e.target.checked)} />
          Solo primo ordine
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={showInOffers} onChange={e => setShowInOffers(e.target.checked)} />
          🔥 Mostra a tutti nella scheda Offerte
        </label>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 4, fontSize: '.75rem', color: 'var(--muted)' }}>
            Scadenza (opzionale)
            <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} style={iStyle} />
          </label>
          <label style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 4, fontSize: '.75rem', color: 'var(--muted)' }}>
            Utilizzi massimi (opzionale)
            <input type="number" min={1} placeholder="illimitati" value={maxUses} onChange={e => setMaxUses(e.target.value)} style={iStyle} />
          </label>
        </div>

        <input placeholder="Nota interna (opzionale)" value={note} onChange={e => setNote(e.target.value)} maxLength={200} style={iStyle} />

        {result && (
          <div style={{ fontSize: '.85rem', textAlign: 'center', color: result.startsWith('✅') ? 'var(--green)' : 'var(--red)' }}>
            {result}
          </div>
        )}
        <button type="submit" disabled={saving} style={{
          padding: '13px', borderRadius: 10, fontFamily: 'inherit', fontWeight: 700,
          fontSize: '1rem', cursor: saving ? 'default' : 'pointer',
          background: 'rgba(61,255,110,.18)', border: '1.5px solid rgba(61,255,110,.5)',
          color: 'var(--green)', boxShadow: '0 0 16px rgba(61,255,110,.1)',
        }}>
          {saving ? 'Salvataggio...' : codes.some(c => c.code === code) ? '💾 Aggiorna codice' : '➕ Crea codice'}
        </button>
      </form>

      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', marginBottom: 12 }}>
        Codici ({codes.length})
      </div>
      {codes.length === 0 && (
        <div style={{ fontSize: '.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          Nessun codice creato. BENVENUTO10 (−10% primo ordine, Spagna/Italia) resta attivo di default:
          se crei un codice con lo stesso nome qui, vale la configurazione del pannello.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {codes.map(c => {
          const st = status(c)
          return (
            <div key={c.code} style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px',
              opacity: c.active ? 1 : .6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, letterSpacing: '.05em' }}>{c.code}</span>
                <span style={{ color: 'var(--gold)', fontWeight: 700 }}>−{c.percent}%</span>
                <span style={{ fontSize: '.68rem', fontWeight: 700, color: st.color, border: `1px solid ${st.color}`, borderRadius: 999, padding: '2px 8px' }}>{st.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: '.75rem', color: 'var(--muted)' }}>
                  {c.uses}{c.maxUses != null ? ` / ${c.maxUses}` : ''} utilizzi
                </span>
              </div>
              <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 6, lineHeight: 1.6 }}>
                {c.origins.length ? c.origins.map(o => ORIGINS.find(x => x.key === o)?.label ?? o).join(' · ') : 'Tutte le spedizioni'}
                {c.firstOrderOnly && ' · solo primo ordine'}
                {c.showInOffers && ' · 🔥 visibile in Offerte'}
                {c.expiresAt && ` · scade il ${new Date(c.expiresAt).toLocaleDateString('it-IT')}`}
                {c.note && <div style={{ fontStyle: 'italic' }}>{c.note}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button onClick={() => toggleActive(c)} style={chip(c.active)}>{c.active ? '⏸ Disattiva' : '▶️ Attiva'}</button>
                <button onClick={() => edit(c)} style={chip(false)}>✏️ Modifica</button>
                <button onClick={() => handleDelete(c)} style={{
                  ...chip(false), background: 'rgba(232,59,59,.1)', border: '1px solid rgba(232,59,59,.2)', color: 'var(--red)',
                }}>🗑 Elimina</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
