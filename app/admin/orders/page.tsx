'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import ManualOrderForm from './ManualOrderForm'
import { PageHeader, Card, Segmented, Pill, Empty, ORDER_STATUS, eur } from '@/components/admin/ui'

interface OrderItem { id: string; name?: string; emoji?: string; label: string; price: number; qty: number }
interface Order { id: string; userId: string; status: string; total: number; items: OrderItem[]; note?: string | null; tracking?: string | null; createdAt: string }

type Tab = 'pending' | 'paid' | 'shipped' | 'delivered' | 'stale' | 'cancelled' | 'all'
const STALE_MS = 21 * 86_400_000
const isStale = (o: Order) => o.status === 'pending' && Date.now() - new Date(o.createdAt).getTime() > STALE_MS

const TABS: { value: Tab; label: string; test: (o: Order) => boolean }[] = [
  { value: 'pending',   label: '💳 Da incassare', test: o => o.status === 'pending' && !isStale(o) },
  { value: 'paid',      label: '📦 Da spedire',   test: o => o.status === 'paid' },
  { value: 'shipped',   label: '🚚 Spediti',      test: o => o.status === 'shipped' },
  { value: 'delivered', label: '✅ Consegnati',   test: o => o.status === 'delivered' },
  { value: 'stale',     label: '🗂️ Vecchi in attesa', test: isStale },
  { value: 'cancelled', label: '✕ Annullati',     test: o => o.status === 'cancelled' },
  { value: 'all',       label: 'Tutti',           test: () => true },
]

// Passo successivo naturale per ogni stato
const NEXT: Record<string, { to: string; label: string } | undefined> = {
  pending: { to: 'paid', label: '💳 Segna pagato' },
  paid: { to: 'shipped', label: '🚚 Segna spedito' },
  shipped: { to: 'delivered', label: '✅ Segna consegnato' },
}

// Etichette leggibili dalla nota: [Spagna] [Crypto] [Solo di persona] …
function noteTags(note?: string | null): { tags: string[]; text: string } {
  if (!note) return { tags: [], text: '' }
  const tags = Array.from(note.matchAll(/\[([^\]]+)\]/g)).map(m => m[1])
  return { tags, text: note.replace(/\[[^\]]+\]/g, '').trim() }
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('pending')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showNew, setShowNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(() => {
    fetch('/api/orders').then(r => r.json()).then(d => { setOrders(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    // Parametri dalla dashboard: ?tab=paid · ?q=MTH-… · ?new=1
    const sp = new URLSearchParams(window.location.search)
    const t = sp.get('tab') as Tab | null
    if (t && TABS.some(x => x.value === t)) setTab(t)
    if (sp.get('q')) { setSearch(sp.get('q')!); setTab('all'); setOpen(sp.get('q')) }
    if (sp.get('new')) setShowNew(true)
    load()
  }, [load])

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  async function setStatus(ids: string[], status: string) {
    setBusy(true)
    const res = await fetch('/api/orders', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ids.length === 1 ? { id: ids[0], status } : { ids, status }),
    }).catch(() => null)
    setBusy(false)
    if (!res?.ok) return flash('❌ Aggiornamento non riuscito')
    setOrders(prev => prev.map(o => ids.includes(o.id) ? { ...o, status } : o))
    setSelected(new Set())
    flash(`✅ ${ids.length === 1 ? 'Ordine aggiornato' : `${ids.length} ordini aggiornati`}: ${ORDER_STATUS[status]?.short ?? status}`)
  }

  async function saveTracking(id: string, tracking: string, alsoShip: boolean) {
    const res = await fetch('/api/orders', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alsoShip ? { id, tracking, status: 'shipped' } : { id, tracking }),
    }).catch(() => null)
    if (!res?.ok) return flash('❌ Salvataggio non riuscito')
    setOrders(prev => prev.map(o => o.id === id ? { ...o, tracking, ...(alsoShip ? { status: 'shipped' } : {}) } : o))
    flash(alsoShip ? '✅ Spedito · il cliente riceve la notifica' : '✅ Tracking salvato')
  }

  const counts = useMemo(() => Object.fromEntries(TABS.map(t => [t.value, orders.filter(t.test).length])) as Record<Tab, number>, [orders])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const t = TABS.find(x => x.value === tab)!
    return orders.filter(o => (q ? true : t.test(o)) && (!q || o.userId.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)))
  }, [orders, tab, search])
  const sum = filtered.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allSelected = filtered.length > 0 && filtered.every(o => selected.has(o.id))

  return (
    <div>
      <PageHeader
        icon="🧾" title="Ordini"
        subtitle={loading ? 'Caricamento…' : `${filtered.length} ordini · ${eur(sum)}`}
        actions={<button className={`adm-btn ${showNew ? '' : 'primary'}`} onClick={() => setShowNew(v => !v)}>{showNew ? 'Chiudi' : '＋ Ordine manuale'}</button>}
      />

      {showNew && <ManualOrderForm onClose={() => setShowNew(false)} onCreated={(o) => { setOrders(prev => [o as Order, ...prev]); flash('✅ Ordine registrato') }} />}

      {/* Filtri */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        <input className="adm-input" placeholder="🔍 Cerca cliente o numero ordine…" value={search} onChange={e => setSearch(e.target.value)} />
        {!search && (
          <Segmented value={tab} onChange={(v) => { setTab(v); setSelected(new Set()) }}
            options={TABS.map(t => ({ value: t.value, label: t.label, count: counts[t.value] }))} />
        )}
        {tab === 'stale' && !search && counts.stale > 0 && (
          <div style={{ fontSize: '.76rem', color: 'var(--a-dim)', lineHeight: 1.5 }}>
            Ordini rimasti “in attesa di pagamento” da più di 21 giorni. Se non sono mai stati pagati, selezionali e premi <strong>Annulla</strong>:
            escono dal fatturato. Se invece sono stati pagati, segnali come consegnati.
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '.76rem', color: 'var(--a-dim)', marginBottom: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map(o => o.id)))} />
          Seleziona tutti ({filtered.length})
        </label>
      )}

      {loading ? <Card><Empty icon="⏳">Caricamento…</Empty></Card> : filtered.length === 0 ? (
        <Card><Empty icon={tab === 'paid' ? '🎉' : '📭'}>{tab === 'paid' ? 'Niente da spedire' : 'Nessun ordine qui'}</Empty></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(o => {
            const st = isStale(o) ? { ...ORDER_STATUS.pending, short: 'Vecchio in attesa', color: '#8aa58c' } : (ORDER_STATUS[o.status] ?? ORDER_STATUS.pending)
            const items = Array.isArray(o.items) ? o.items : []
            const { tags, text } = noteTags(o.note)
            const next = NEXT[o.status]
            const isOpen = open === o.id
            const sel = selected.has(o.id)
            return (
              <div key={o.id} className="adm-card" style={{ padding: 0, overflow: 'hidden', borderColor: sel ? 'rgba(61,255,110,.45)' : isOpen ? 'var(--a-line-2)' : undefined }}>
                <div style={{ display: 'flex', gap: 10, padding: '12px 12px 10px' }}>
                  <input type="checkbox" checked={sel} onChange={() => toggle(o.id)} style={{ marginTop: 3, flexShrink: 0 }} aria-label="Seleziona" />
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setOpen(isOpen ? null : o.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '.9rem' }}>@{o.userId}</strong>
                      <Pill color={st.color}>{st.icon} {st.short}</Pill>
                      <strong style={{ marginLeft: 'auto', fontFamily: "'Fredoka One', cursive", fontSize: '1.1rem', color: o.status === 'cancelled' ? 'var(--a-faint)' : 'var(--a-text)', textDecoration: o.status === 'cancelled' ? 'line-through' : 'none' }}>{eur(o.total)}</strong>
                    </div>
                    <div style={{ fontSize: '.7rem', color: 'var(--a-dim)', marginTop: 3 }}>
                      {new Date(o.createdAt).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · <span style={{ fontFamily: 'monospace' }}>{o.id}</span>
                    </div>
                    <div style={{ fontSize: '.76rem', marginTop: 6, color: 'rgba(233,245,234,.85)', whiteSpace: isOpen ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {items.map(x => `${x.emoji ?? ''} ${x.name ?? x.id} ${x.label} ×${x.qty}`.trim()).join(' · ')}
                    </div>
                    {tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                        {tags.map(t => <span key={t} className="adm-pill" style={{ background: 'var(--a-surface-2)', border: '1px solid var(--a-line-2)', color: t.startsWith('⚠') ? 'var(--a-red)' : 'var(--a-dim)' }}>{t}</span>)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Azione principale sempre visibile */}
                {(next || o.tracking) && !isOpen && (
                  <div style={{ display: 'flex', gap: 8, padding: '0 12px 12px 38px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {next && o.status !== 'paid' && <button className="adm-btn sm soft" disabled={busy} onClick={() => setStatus([o.id], next.to)}>{next.label}</button>}
                    {o.status === 'paid' && <button className="adm-btn sm soft" onClick={() => setOpen(o.id)}>🚚 Spedisci (aggiungi tracking)</button>}
                    {o.tracking && <span style={{ fontSize: '.7rem', color: 'var(--a-blue)' }}>📍 {o.tracking}</span>}
                  </div>
                )}

                {isOpen && (
                  <OrderDetail order={o} text={text} busy={busy}
                    onStatus={(s) => setStatus([o.id], s)}
                    onTracking={(t, ship) => saveTracking(o.id, t, ship)} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Barra azioni multiple */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))', zIndex: 70,
          width: 'min(640px, calc(100% - 20px))', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: 10,
          background: 'var(--a-surface-2)', border: '1px solid var(--a-line-2)', borderRadius: 16, boxShadow: '0 12px 30px rgba(0,0,0,.6)',
        }}>
          <strong style={{ fontSize: '.8rem', marginRight: 4 }}>{selected.size} selezionati</strong>
          <button className="adm-btn sm" disabled={busy} onClick={() => setStatus(Array.from(selected), 'paid')}>💳 Pagati</button>
          <button className="adm-btn sm" disabled={busy} onClick={() => setStatus(Array.from(selected), 'shipped')}>🚚 Spediti</button>
          <button className="adm-btn sm" disabled={busy} onClick={() => setStatus(Array.from(selected), 'delivered')}>✅ Consegnati</button>
          <button className="adm-btn sm danger" disabled={busy} onClick={() => { if (confirm(`Annullare ${selected.size} ordini? Non conteranno più nel fatturato.`)) setStatus(Array.from(selected), 'cancelled') }}>✕ Annulla</button>
          <button className="adm-btn sm" style={{ marginLeft: 'auto' }} onClick={() => setSelected(new Set())}>Deseleziona</button>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)', top: 70, zIndex: 95, padding: '10px 16px', borderRadius: 12,
          background: 'var(--a-surface-2)', border: '1px solid var(--a-line-2)', fontSize: '.82rem', fontWeight: 700, boxShadow: '0 10px 30px rgba(0,0,0,.6)',
        }}>{toast}</div>
      )}
    </div>
  )
}

function OrderDetail({ order: o, text, busy, onStatus, onTracking }: {
  order: Order; text: string; busy: boolean
  onStatus: (s: string) => void; onTracking: (t: string, ship: boolean) => void
}) {
  const [tracking, setTracking] = useState(o.tracking ?? '')
  const items = Array.isArray(o.items) ? o.items : []
  const subtotal = items.reduce((s, x) => s + x.price * x.qty, 0)
  return (
    <div style={{ borderTop: '1px solid var(--a-line)', padding: 12, display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(0,0,0,.15)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((x, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, fontSize: '.8rem' }}>
            <span>{x.emoji ?? '📦'}</span>
            <span style={{ flex: 1, minWidth: 0 }}>{x.name ?? x.id} <span style={{ color: 'var(--a-gold)' }}>[{x.label}]</span> <span style={{ color: 'var(--a-dim)' }}>×{x.qty}</span></span>
            <span style={{ color: 'var(--a-dim)' }}>{eur(x.price * x.qty)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', color: 'var(--a-dim)', borderTop: '1px dashed var(--a-line-2)', paddingTop: 6, marginTop: 2 }}>
          <span>Prodotti {eur(subtotal)}{Math.abs(subtotal - o.total) > 0.01 ? ` · differenza ${eur(o.total - subtotal)} (spedizione/sconti)` : ''}</span>
          <strong style={{ color: 'var(--a-text)' }}>Totale {eur(o.total)}</strong>
        </div>
      </div>

      {text && <div style={{ fontSize: '.76rem', color: 'var(--a-dim)', borderLeft: '3px solid var(--a-gold)', paddingLeft: 10 }}>📝 {text}</div>}

      <div>
        <div style={{ fontSize: '.7rem', fontWeight: 800, color: 'var(--a-dim)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>📍 Tracking</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <input className="adm-input" style={{ flex: 1, minWidth: 180, fontFamily: 'monospace' }} placeholder="Numero di tracciamento" value={tracking} onChange={e => setTracking(e.target.value)} />
          {o.status === 'paid' || o.status === 'pending'
            ? <button className="adm-btn soft" disabled={busy} onClick={() => onTracking(tracking.trim(), true)}>🚚 Salva e segna spedito</button>
            : <button className="adm-btn" disabled={busy || tracking.trim() === (o.tracking ?? '')} onClick={() => onTracking(tracking.trim(), false)}>💾 Salva</button>}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '.7rem', fontWeight: 800, color: 'var(--a-dim)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Stato</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(ORDER_STATUS).map(([s, m]) => (
            <button key={s} className="adm-btn sm" disabled={busy || o.status === s}
              onClick={() => { if (s !== 'cancelled' || confirm('Annullare questo ordine? Non conterà nel fatturato.')) onStatus(s) }}
              style={o.status === s ? { color: m.color, borderColor: m.color, opacity: 1 } : undefined}>
              {m.icon} {m.short}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
