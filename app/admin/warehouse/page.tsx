'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Payment {
  id: string; seq: number; receiptNo: string
  periodStart: string; periodEnd: string
  base: number; vacationDays: number; deduction: number; total: number; paidAt: string
}
interface Vacation { id: string; days: number; note: string | null; createdAt: string }
interface WarehouseData {
  config: { monthly: number; perPayment: number; daily: number; start: string }
  next: { seq: number; periodStart: string; periodEnd: string; base: number; pendingVacationDays: number; deductDays: number; deduction: number; total: number }
  pendingVacationDays: number
  totalPaid: number
  payments: Payment[]
  vacations: Vacation[]
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })

export default function AdminWarehouse() {
  const [data, setData] = useState<WarehouseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [vacDays, setVacDays] = useState('')
  const [vacNote, setVacNote] = useState('')
  const [receipt, setReceipt] = useState<Payment | null>(null)

  async function load() {
    try {
      const d = await fetch('/api/admin/warehouse').then(r => r.json())
      setData(d)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function pay() {
    if (!confirm(`Confermi il pagamento di €${data?.next.total.toFixed(2)} per il periodo ${fmtDay(data!.next.periodStart)} – ${fmtDay(data!.next.periodEnd)}?`)) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/warehouse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'pay' }) })
      const d = await res.json()
      if (d.payment) setReceipt(d.payment)
      await load()
    } finally { setBusy(false) }
  }

  async function addVacation() {
    const n = parseInt(vacDays, 10)
    if (!n || n < 1) return
    setBusy(true)
    try {
      await fetch('/api/admin/warehouse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'vacation', days: n, note: vacNote }) })
      setVacDays(''); setVacNote('')
      await load()
    } finally { setBusy(false) }
  }

  async function undoLast() {
    if (!confirm('Annullare l’ultimo pagamento registrato?')) return
    setBusy(true)
    try {
      await fetch('/api/admin/warehouse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'undo' }) })
      await load()
    } finally { setBusy(false) }
  }

  async function deleteVacation(id: string) {
    setBusy(true)
    try {
      await fetch('/api/admin/warehouse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteVacation', id }) })
      await load()
    } finally { setBusy(false) }
  }

  if (loading) return <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>Caricamento…</div>
  if (!data) return <div style={{ color: 'var(--red)', textAlign: 'center', padding: 40 }}>Errore nel caricamento</div>

  const { config, next } = data

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/admin" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '1.2rem' }}>‹</Link>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.4rem' }}>🏭 Magazzino</span>
      </div>

      {/* Info affitto */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {[
          { label: 'Affitto mensile', value: `€${config.monthly}`, color: 'var(--text)' },
          { label: 'Ogni 15 giorni', value: `€${config.perPayment}`, color: 'var(--gold)' },
          { label: 'Costo giornaliero', value: `€${config.daily.toFixed(2)}`, color: 'var(--muted)' },
          { label: 'Totale pagato', value: `€${data.totalPaid.toFixed(2)}`, color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: '.66rem', color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px' }}>{s.label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, fontFamily: "'Fredoka One', cursive" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Prossimo pagamento */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245,200,66,.08), rgba(61,255,110,.05))',
        border: '1px solid rgba(245,200,66,.3)', borderRadius: 16, padding: '18px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 6 }}>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.05rem' }}>📅 Prossimo pagamento</div>
          <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>Rata #{next.seq + 1} · {fmtDate(next.periodStart)} – {fmtDate(next.periodEnd)}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '.85rem', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
            <span>Quota base (15 giorni)</span><span>€{next.base.toFixed(2)}</span>
          </div>
          {next.deduction > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7ec8f8' }}>
              <span>🏖 Vacanza ({next.deductDays} giorni)</span><span>−€{next.deduction.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 2 }}>
            <span style={{ fontWeight: 700 }}>Totale da pagare</span>
            <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.6rem', color: 'var(--green)', textShadow: 'var(--led-green)' }}>€{next.total.toFixed(2)}</span>
          </div>
        </div>

        {next.pendingVacationDays > next.deductDays && (
          <div style={{ fontSize: '.7rem', color: '#7ec8f8', marginBottom: 10 }}>
            ℹ️ {next.pendingVacationDays - next.deductDays} giorni di vacanza residui verranno scalati dalle rate successive.
          </div>
        )}

        <button
          onClick={pay}
          disabled={busy}
          className="checkout-btn"
          style={{ width: '100%' }}
        >{busy ? '…' : `✅ Segna come pagato — €${next.total.toFixed(2)}`}</button>
      </div>

      {/* Vacanza */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ fontSize: '.9rem', fontWeight: 700, marginBottom: 4 }}>🏖 Registra giorni di vacanza</div>
        <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginBottom: 12 }}>
          I giorni di chiusura non si pagano: vengono scalati (€{config.daily.toFixed(2)}/giorno) dal prossimo pagamento. Vacanza attualmente in sospeso: <strong style={{ color: '#7ec8f8' }}>{data.pendingVacationDays} giorni</strong>.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="number" min={1} value={vacDays} onChange={e => setVacDays(e.target.value)}
            placeholder="Giorni"
            style={{ width: 100, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text)', fontSize: '.88rem', fontFamily: 'inherit', outline: 'none' }}
          />
          <input
            value={vacNote} onChange={e => setVacNote(e.target.value)}
            placeholder="Nota (opzionale, es. Ferragosto)"
            style={{ flex: 1, minWidth: 140, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text)', fontSize: '.88rem', fontFamily: 'inherit', outline: 'none' }}
          />
          <button
            onClick={addVacation}
            disabled={busy || !vacDays}
            style={{ padding: '10px 18px', borderRadius: 10, fontFamily: 'inherit', fontWeight: 700, fontSize: '.85rem', cursor: busy || !vacDays ? 'default' : 'pointer', background: 'rgba(59,130,246,.14)', border: '1px solid rgba(59,130,246,.4)', color: '#7ec8f8', opacity: !vacDays ? .6 : 1 }}
          >Aggiungi</button>
        </div>

        {data.vacations.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.vacations.map(v => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg3)', borderRadius: 8, padding: '7px 11px', fontSize: '.76rem' }}>
                <span style={{ fontWeight: 700, color: '#7ec8f8' }}>{v.days} giorni</span>
                {v.note && <span style={{ color: 'var(--muted)' }}>· {v.note}</span>}
                <span style={{ color: 'var(--muted)', marginLeft: 'auto' }}>{fmtDate(v.createdAt)}</span>
                <button onClick={() => deleteVacation(v.id)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '.85rem' }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Storico ricevute */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem' }}>🧾 Ricevute ({data.payments.length})</div>
          {data.payments.length > 0 && (
            <button onClick={undoLast} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '.72rem', textDecoration: 'underline' }}>Annulla ultimo</button>
          )}
        </div>
        {data.payments.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: '.82rem', textAlign: 'center', padding: 24 }}>Nessun pagamento registrato</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...data.payments].reverse().map(p => (
              <button key={p.id} onClick={() => setReceipt(p)} style={{ textAlign: 'left', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '.78rem', color: 'var(--gold)', fontWeight: 700 }}>{p.receiptNo}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 2 }}>{fmtDay(p.periodStart)} – {fmtDay(p.periodEnd)} · pagato {fmtDate(p.paidAt)}</div>
                </div>
                {p.deduction > 0 && <span style={{ fontSize: '.62rem', color: '#7ec8f8', background: 'rgba(59,130,246,.12)', border: '1px solid rgba(59,130,246,.3)', borderRadius: 20, padding: '2px 8px' }}>−{p.vacationDays}g</span>}
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.1rem', color: 'var(--green)' }}>€{p.total.toFixed(2)}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modale ricevuta */}
      {receipt && (
        <div onClick={() => setReceipt(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 22px', maxWidth: 360, width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '2rem' }}>🧾</div>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.2rem' }}>Ricevuta affitto magazzino</div>
              <div style={{ fontFamily: 'monospace', fontSize: '.8rem', color: 'var(--gold)', marginTop: 2 }}>{receipt.receiptNo}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}><span>Periodo</span><span style={{ color: 'var(--text)' }}>{fmtDay(receipt.periodStart)} – {fmtDay(receipt.periodEnd)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}><span>Quota base</span><span>€{receipt.base.toFixed(2)}</span></div>
              {receipt.deduction > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7ec8f8' }}><span>Vacanza ({receipt.vacationDays} giorni)</span><span>−€{receipt.deduction.toFixed(2)}</span></div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
                <span style={{ fontWeight: 700 }}>TOTALE</span>
                <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem', color: 'var(--green)' }}>€{receipt.total.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '.72rem', marginTop: 4 }}><span>Pagato il</span><span>{fmtDate(receipt.paidAt)}</span></div>
            </div>
            <button onClick={() => setReceipt(null)} style={{ width: '100%', marginTop: 18, padding: '11px', borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' }}>Chiudi</button>
          </div>
        </div>
      )}
    </div>
  )
}
