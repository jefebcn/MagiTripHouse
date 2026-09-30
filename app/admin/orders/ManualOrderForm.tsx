'use client'
import { useEffect, useMemo, useState } from 'react'
import { parseOrderMessage } from '@/lib/parse-order-message'

interface Variant { label: string; price: number }
interface Product { id: string; name: string; emoji: string; variants: Variant[] }
interface Line { productId: string; name: string; emoji: string; label: string; price: number; qty: number }

const iStyle: React.CSSProperties = {
  background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
  padding: '10px 12px', color: 'var(--text)', fontSize: '.85rem', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box',
}

// Ora locale nel formato richiesto da <input type="datetime-local">
function toLocalInput(d: Date) {
  const x = new Date(d)
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset())
  return x.toISOString().slice(0, 16)
}
const nowLocal = () => toLocalInput(new Date())
// Confronto nomi senza emoji/punteggiatura
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9à-ÿ]+/g, ' ').trim()

export default function ManualOrderForm({ onCreated }: { onCreated: (order: unknown) => void }) {
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [userId, setUserId] = useState('')
  const [status, setStatus] = useState('paid')
  const [date, setDate] = useState(nowLocal)
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [pick, setPick] = useState('')
  const [pickVariant, setPickVariant] = useState(0)
  const [totalOverride, setTotalOverride] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [paste, setPaste] = useState('')
  const [orderId, setOrderId] = useState('')

  useEffect(() => {
    if (!open || products.length) return
    fetch('/api/products?all=true').then(r => r.ok ? r.json() : []).then((d: Product[]) => setProducts(Array.isArray(d) ? d : [])).catch(() => {})
  }, [open, products.length])

  const picked = products.find(p => p.id === pick)
  const linesTotal = useMemo(() => lines.reduce((s, l) => s + l.price * l.qty, 0), [lines])
  const total = totalOverride !== '' ? Number(totalOverride) : linesTotal

  function addLine() {
    if (!picked) return
    const v = picked.variants?.[pickVariant]
    if (!v) return
    setLines(ls => [...ls, { productId: picked.id, name: picked.name, emoji: picked.emoji, label: v.label, price: v.price, qty: 1 }])
  }

  // Compila il form dal messaggio Telegram dell'ordine
  function fillFromMessage() {
    const r = parseOrderMessage(paste)
    if (!r.items.length) return setMsg('❌ Non trovo prodotti nel messaggio: incollalo per intero')
    setLines(r.items.map(it => {
      const p = products.find(x => norm(x.name) === norm(it.name)) ?? products.find(x => norm(x.name).endsWith(norm(it.name)) || norm(it.name).endsWith(norm(x.name)))
      return { productId: p?.id ?? '', name: p?.name ?? it.name, emoji: p?.emoji ?? it.emoji, label: it.label, price: it.unitPrice, qty: it.qty }
    }))
    if (r.id) setOrderId(r.id)
    if (r.createdAt) setDate(toLocalInput(r.createdAt))
    if (r.total != null) setTotalOverride(String(r.total))
    if (r.note) setNote(r.note)
    if (r.customer && !userId) setUserId(r.customer.toLowerCase())
    setMsg(`✅ Compilato: ${r.items.length} prodotti${r.total != null ? ` · €${r.total.toFixed(2)}` : ''}. Controlla il cliente e salva.`)
  }

  async function save() {
    setMsg('')
    setSaving(true)
    const res = await fetch('/api/admin/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: orderId || undefined, userId, status, note, total,
        createdAt: new Date(date).toISOString(),
        items: lines.map(l => ({ id: l.productId, name: l.name, emoji: l.emoji, label: l.label, price: l.price, qty: l.qty })),
      }),
    })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) return setMsg(`❌ ${d.error ?? 'Errore'}`)
    onCreated(d)
    setMsg(`✅ Ordine ${d.id} registrato`)
    setUserId(''); setNote(''); setLines([]); setTotalOverride(''); setDate(nowLocal()); setOrderId(''); setPaste('')
    setTimeout(() => { setMsg(''); setOpen(false) }, 2500)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        width: '100%', marginBottom: 14, padding: '11px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '.85rem',
        background: 'rgba(61,255,110,.1)', border: '1px dashed rgba(61,255,110,.45)', color: 'var(--green)',
      }}>➕ Registra ordine manuale</button>
    )
  }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid rgba(61,255,110,.25)', borderRadius: 14, padding: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.05rem', flex: 1 }}>➕ Registra ordine manuale</span>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
      </div>
      <div style={{ fontSize: '.72rem', color: 'var(--muted)', lineHeight: 1.45 }}>
        Per ordini presi in chat o non salvati dall’app. Conta nel fatturato del giorno scelto (giornaliero, settimanale, mensile).
      </div>

      {/* Incolla il messaggio Telegram → compila tutto */}
      <textarea
        value={paste} onChange={e => setPaste(e.target.value)} rows={4}
        placeholder="📋 Incolla qui il messaggio dell’ordine (🛒 NUOVO ORDINE — Magic Trip House …) per compilare tutto in automatico"
        style={{ ...iStyle, resize: 'vertical', fontSize: '.78rem' }}
      />
      <button onClick={fillFromMessage} disabled={!paste.trim() || !products.length} style={{
        padding: '10px', borderRadius: 10, fontFamily: 'inherit', fontWeight: 700, fontSize: '.82rem',
        cursor: paste.trim() && products.length ? 'pointer' : 'default', opacity: paste.trim() && products.length ? 1 : .5,
        background: 'rgba(245,200,66,.12)', border: '1px solid rgba(245,200,66,.45)', color: 'var(--gold)',
      }}>{products.length ? '⚡ Compila dal messaggio' : 'Caricamento prodotti…'}</button>

      {orderId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.78rem' }}>
          <span style={{ color: 'var(--muted)' }}>N° ordine originale:</span>
          <strong style={{ fontFamily: 'monospace', color: 'var(--green)' }}>{orderId}</strong>
          <button onClick={() => setOrderId('')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input placeholder="Cliente (username, es. xander91)" value={userId} onChange={e => setUserId(e.target.value)} style={{ ...iStyle, flex: 2, minWidth: 180 }} />
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...iStyle, flex: 1, minWidth: 130 }}>
          <option value="pending">🟡 In attesa pag.</option>
          <option value="paid">💚 Pagato</option>
          <option value="shipped">🔵 Spedito</option>
          <option value="delivered">🟢 Consegnato</option>
        </select>
        <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} style={{ ...iStyle, flex: 1, minWidth: 180 }} />
      </div>

      {/* Prodotti */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select value={pick} onChange={e => { setPick(e.target.value); setPickVariant(0) }} style={{ ...iStyle, flex: 2, minWidth: 180 }}>
          <option value="">Scegli prodotto…</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
        </select>
        <select value={pickVariant} onChange={e => setPickVariant(Number(e.target.value))} disabled={!picked} style={{ ...iStyle, flex: 1, minWidth: 120 }}>
          {(picked?.variants ?? []).map((v, i) => <option key={i} value={i}>{v.label} · €{v.price}</option>)}
        </select>
        <button onClick={addLine} disabled={!picked} style={{
          padding: '10px 14px', borderRadius: 10, cursor: picked ? 'pointer' : 'default', fontFamily: 'inherit', fontWeight: 700,
          background: 'rgba(59,130,246,.15)', border: '1px solid rgba(59,130,246,.4)', color: 'var(--blue)', opacity: picked ? 1 : .5,
        }}>Aggiungi</button>
      </div>

      {lines.map((l, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card)', borderRadius: 10, padding: '8px 10px', fontSize: '.8rem' }}>
          <span>{l.emoji}</span>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name} <span style={{ color: 'var(--gold)' }}>[{l.label}]</span></span>
          <span style={{ color: 'var(--muted)' }}>€</span>
          <input type="number" step="any" value={l.price} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, price: Number(e.target.value) } : x))} style={{ ...iStyle, width: 70, padding: '6px 8px' }} />
          <span style={{ color: 'var(--muted)' }}>×</span>
          <input type="number" min={1} value={l.qty} onChange={e => setLines(ls => ls.map((x, j) => j === i ? { ...x, qty: Math.max(1, Number(e.target.value)) } : x))} style={{ ...iStyle, width: 56, padding: '6px 8px' }} />
          <button onClick={() => setLines(ls => ls.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>🗑</button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input placeholder="Nota (es. spedizione, sconto, pagamento)" value={note} onChange={e => setNote(e.target.value)} style={{ ...iStyle, flex: 2, minWidth: 200 }} />
        <label style={{ flex: 1, minWidth: 150, display: 'flex', alignItems: 'center', gap: 6, fontSize: '.75rem', color: 'var(--muted)' }}>
          Totale €
          <input type="number" step="any" placeholder={linesTotal.toFixed(2)} value={totalOverride} onChange={e => setTotalOverride(e.target.value)} style={{ ...iStyle, padding: '8px 10px' }} />
        </label>
      </div>
      <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>
        Somma prodotti €{linesTotal.toFixed(2)} · lascia vuoto “Totale” per usarla, oppure scrivi il totale reale (con spedizione/sconti).
      </div>

      {msg && <div style={{ fontSize: '.82rem', color: msg.startsWith('✅') ? 'var(--green)' : 'var(--red)' }}>{msg}</div>}
      <button onClick={save} disabled={saving || !userId.trim() || !lines.length} style={{
        padding: '12px', borderRadius: 10, fontFamily: 'inherit', fontWeight: 800, fontSize: '.9rem',
        cursor: saving || !userId.trim() || !lines.length ? 'default' : 'pointer',
        background: 'rgba(61,255,110,.18)', border: '1.5px solid rgba(61,255,110,.5)', color: 'var(--green)',
        opacity: saving || !userId.trim() || !lines.length ? .5 : 1,
      }}>{saving ? 'Salvataggio…' : `💾 Registra ordine · €${(Number.isFinite(total) ? total : 0).toFixed(2)}`}</button>
    </div>
  )
}
