'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { PageHeader, Card, Segmented, Pill, Empty, ORDER_STATUS, eur } from '@/components/admin/ui'

type PeriodKey = 'today' | 'week' | 'month' | 'total'
interface Win { revenue: number; orders: number; avg: number; cost: number; shipCost: number; discounts: number; rent: number; grossProfit: number; net: number; margin: number | null; unknownRevenue: number }
interface Stats {
  daily: { date: string; revenue: number; profit: number; orders: number }[]
  missingCost: { name: string; revenue: number }[]
  periods: Record<PeriodKey, { cur: Win; prev: Win | null }>
  todo: { awaitingPayment: number; toShip: number; stalePending: number; partnerClaims: number; payouts: number }
  orders: { total: number; pending: number; paid: number; shipped: number; delivered: number; cancelled: number }
  users: { total: number; today: number; week: number }
  recentOrders: { id: string; userId: string; total: number; status: string; createdAt: string }[]
  grams: { total: number; today: number; week: number; month: number; year: number }
  productStats: { name: string; grams: number; revenue: number; qty: number; ordersCount: number; avgPricePerGram: number; cost: number; profit: number; costKnown: boolean; margin: number | null }[]
  profit: { cost: number; profit: number; margin: number | null; warehouseRent: number; shippingOrders: number; shippingLoss: number; net: number }
}

const PERIODS: { value: PeriodKey; label: string; vs: string }[] = [
  { value: 'today', label: 'Oggi',     vs: 'ieri alla stessa ora' },
  { value: 'week',  label: '7 giorni', vs: '7 giorni prima' },
  { value: 'month', label: '30 giorni', vs: '30 giorni prima' },
  { value: 'total', label: 'Sempre',   vs: '' },
]
const gramsFor: Record<PeriodKey, keyof Stats['grams']> = { today: 'today', week: 'week', month: 'month', total: 'total' }
const fmtG = (n: number) => n >= 1000 ? `${(n / 1000).toLocaleString('it-IT', { maximumFractionDigits: 2 })} kg` : `${Math.round(n)} g`

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (!prev && !cur) return null
  if (!prev) return <span style={{ fontSize: '.7rem', fontWeight: 800, color: 'var(--a-green)' }}>nuovo</span>
  const d = ((cur - prev) / prev) * 100
  const up = d >= 0
  return <span style={{ fontSize: '.7rem', fontWeight: 800, color: up ? 'var(--a-green)' : 'var(--a-red)' }}>{up ? '▲' : '▼'} {Math.abs(d).toFixed(0)}%</span>
}

// Grafico a barre degli ultimi 14 giorni (SVG, nessuna libreria)
function RevenueChart({ data }: { data: Stats['daily'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map(d => d.revenue))
  const W = 700, H = 170, pad = 4, bw = W / data.length
  const sel = hover ?? data.length - 1
  const d = data[sel]
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.35rem', color: 'var(--a-text)' }}>{eur(d.revenue)}</span>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.05rem', color: d.profit >= 0 ? 'var(--a-green)' : 'var(--a-red)' }}>utile {eur(d.profit)}</span>
        <span style={{ fontSize: '.74rem', color: 'var(--a-dim)' }}>
          {new Date(d.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })} · {d.orders} ordin{d.orders === 1 ? 'e' : 'i'}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 18}`} style={{ width: '100%', height: 'auto', display: 'block' }} onMouseLeave={() => setHover(null)}>
        {[0.5, 1].map(f => <line key={f} x1={0} x2={W} y1={H - H * f + 1} y2={H - H * f + 1} stroke="var(--a-line)" strokeDasharray="3 5" />)}
        {data.map((x, i) => {
          const h = Math.max(x.revenue > 0 ? 3 : 1, (x.revenue / max) * (H - 8))
          const on = i === sel
          return (
            <g key={x.date} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} style={{ cursor: 'pointer' }}>
              <rect x={i * bw} y={0} width={bw} height={H + 18} fill="transparent" />
              <rect x={i * bw + pad} y={H - h} width={bw - pad * 2} height={h} rx={5}
                fill={on ? 'rgba(233,245,234,.35)' : 'rgba(233,245,234,.14)'} />
              {x.profit > 0 && (() => {
                const ph = Math.max(2, (x.profit / max) * (H - 8))
                return <rect x={i * bw + pad} y={H - ph} width={bw - pad * 2} height={ph} rx={5} fill={on ? 'var(--a-green)' : 'rgba(61,255,110,.55)'} />
              })()}
              {(i % 2 === 1 || data.length <= 7) && (
                <text x={i * bw + bw / 2} y={H + 14} textAnchor="middle" fontSize="11" fill="var(--a-faint)">
                  {new Date(x.date).toLocaleDateString('it-IT', { day: 'numeric', timeZone: 'Europe/Rome' })}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState(false)
  const [period, setPeriod] = useState<PeriodKey>('today')
  const [pushTitle, setPushTitle] = useState('')
  const [pushBody, setPushBody] = useState('')
  const [pushMsg, setPushMsg] = useState('')
  const [importMsg, setImportMsg] = useState('')

  const load = useCallback(() => {
    setError(false)
    fetch('/api/admin/stats').then(r => r.ok ? r.json() : Promise.reject()).then(setStats).catch(() => setError(true))
  }, [])
  useEffect(() => { load() }, [load])

  async function sendBroadcast() {
    if (!pushTitle.trim() || !pushBody.trim()) return
    setPushMsg('Invio…')
    const res = await fetch('/api/push/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: pushTitle.trim(), body: pushBody.trim(), url: '/', emoji: '📢' }),
    }).catch(() => null)
    const d = res ? await res.json().catch(() => ({})) : {}
    setPushMsg(res?.ok ? `✅ Inviata a ${d.sent ?? 0} dispositivi` : '❌ Invio non riuscito')
    if (res?.ok) { setPushTitle(''); setPushBody('') }
  }

  async function runImport() {
    if (!confirm('Importare il catalogo base? I prodotti già presenti vengono saltati.')) return
    setImportMsg('Importazione…')
    const d = await fetch('/api/admin/import-catalog', { method: 'POST' }).then(r => r.json()).catch(() => null)
    setImportMsg(d?.ok ? `✅ ${d.created} creati · ${d.skipped} già presenti` : '❌ Errore importazione')
  }

  const hour = new Date().getHours()
  const hello = hour < 13 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera'
  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })

  if (error) return (
    <>
      <PageHeader icon="📊" title="Dashboard" subtitle={today} />
      <Card><Empty icon="⚠️">Impossibile caricare i dati. <button className="adm-btn sm" onClick={load}>Riprova</button></Empty></Card>
    </>
  )
  if (!stats) return (
    <>
      <PageHeader icon="📊" title="Dashboard" subtitle={today} />
      <Card><Empty icon="⏳">Caricamento…</Empty></Card>
    </>
  )

  const p = stats.periods[period]
  const pm = PERIODS.find(x => x.value === period)!
  const todo = [
    { n: stats.todo.toShip, icon: '📦', label: 'Da spedire', hint: 'pagati, in attesa di spedizione', href: '/admin/orders?tab=paid', color: 'var(--a-gold)' },
    { n: stats.todo.awaitingPayment, icon: '💳', label: 'Da incassare', hint: 'ordini recenti non ancora pagati', href: '/admin/orders?tab=pending', color: 'var(--a-orange)' },
    { n: stats.todo.partnerClaims, icon: '🏆', label: 'Premi da verificare', hint: 'ordini KratosLabs dichiarati', href: '/admin/partner', color: 'var(--a-violet)' },
    { n: stats.todo.payouts, icon: '💸', label: 'Prelievi affiliati', hint: 'richieste di pagamento', href: '/admin/affiliates', color: 'var(--a-blue)' },
    { n: stats.todo.stalePending, icon: '🗂️', label: 'Ordini vecchi in attesa', hint: 'più di 21 giorni: archiviali', href: '/admin/orders?tab=stale', color: 'var(--a-dim)' },
  ].filter(t => t.n > 0)

  const topProducts = [...stats.productStats].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  const topMax = Math.max(1, ...topProducts.map(t => t.revenue))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PageHeader
        title={`${hello} 👋`}
        subtitle={<span style={{ textTransform: 'capitalize' }}>{today}</span>}
        actions={<>
          <button className="adm-btn" onClick={load}>↻ Aggiorna</button>
          <Link className="adm-btn primary" href="/admin/orders?new=1">＋ Ordine manuale</Link>
        </>}
      />

      {/* ── Da fare ── */}
      <Card title="Da fare" icon="✅">
        {todo.length === 0 ? (
          <div style={{ fontSize: '.84rem', color: 'var(--a-dim)' }}>🎉 Tutto in ordine: niente in sospeso.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
            {todo.map(t => (
              <Link key={t.label} href={t.href} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px', borderRadius: 13, textDecoration: 'none', color: 'var(--a-text)',
                background: 'var(--a-surface-2)', border: '1px solid var(--a-line)',
              }}>
                <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.45rem', color: t.color, minWidth: 34, textAlign: 'center' }}>{t.n}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 800, fontSize: '.84rem' }}>{t.icon} {t.label}</span>
                  <span style={{ display: 'block', fontSize: '.66rem', color: 'var(--a-dim)', marginTop: 1 }}>{t.hint}</span>
                </span>
                <span style={{ marginLeft: 'auto', color: 'var(--a-faint)' }}>›</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* ── Numeri del periodo ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
        <Segmented value={period} onChange={setPeriod} options={PERIODS.map(x => ({ value: x.value, label: x.label }))} />
        {pm.vs && <span style={{ fontSize: '.7rem', color: 'var(--a-faint)' }}>confronto con {pm.vs}</span>}
      </div>
      <div className="adm-grid k4">
        {[
          { label: 'Incassato (lordo)', value: eur(p.cur.revenue, true), cur: p.cur.revenue, prev: p.prev?.revenue, color: 'var(--a-text)', hint: `${p.cur.orders} ordini` },
          { label: 'Costo merce', value: `−${eur(p.cur.cost, true)}`, cur: 0, prev: undefined, color: 'var(--a-orange)', hint: 'prezzo d’acquisto dei prodotti' },
          { label: 'Utile netto', value: eur(p.cur.net, true), cur: p.cur.net, prev: p.prev?.net, color: p.cur.net >= 0 ? 'var(--a-green)' : 'var(--a-red)', hint: 'quello che ti resta' },
          { label: 'Margine', value: p.cur.margin != null ? `${p.cur.margin.toFixed(0)}%` : '—', cur: 0, prev: undefined, color: 'var(--a-gold)', hint: 'utile su ogni € incassato' },
        ].map(k => (
          <div key={k.label} className="adm-card" style={{ padding: '14px 14px 12px' }}>
            <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--a-dim)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{k.label}</div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.6rem', color: k.color, marginTop: 4, lineHeight: 1.1 }}>{k.value}</div>
            <div style={{ minHeight: 16, marginTop: 4, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {k.prev != null && <Delta cur={k.cur} prev={k.prev} />}
              <span style={{ fontSize: '.64rem', color: 'var(--a-faint)' }}>{k.hint}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="adm-grid two">
        {/* ── Andamento ── */}
        <Card title="Ultimi 14 giorni" icon="📈">
          <RevenueChart data={stats.daily} />
          <div style={{ display: 'flex', gap: 14, fontSize: '.68rem', color: 'var(--a-dim)', marginTop: 8 }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'rgba(233,245,234,.3)', marginRight: 5, verticalAlign: -1 }} />Incasso</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--a-green)', marginRight: 5, verticalAlign: -1 }} />Utile (dopo costo merce e spedizioni)</span>
          </div>
        </Card>

        {/* ── Conto economico del periodo scelto ── */}
        <Card title={`Da dove viene l’utile · ${pm.label.toLowerCase()}`} icon="💰">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '.84rem' }}>
            {[
              { l: `Incassato (${p.cur.orders} ordini)`, v: eur(p.cur.revenue), c: 'var(--a-text)', note: p.cur.discounts > 0 ? `già al netto di ${eur(p.cur.discounts)} di sconti e crediti` : '' },
              { l: '📦 Costo d’acquisto merce', v: `−${eur(p.cur.cost)}`, c: 'var(--a-orange)', note: '' },
              { l: '🚚 Spedizioni pagate al corriere', v: `−${eur(p.cur.shipCost)}`, c: 'var(--a-orange)', note: p.cur.shipCost ? `€20 a pacco; i €10 pagati dal cliente sono nell’incasso` : '' },
              { l: '🏭 Affitto magazzino', v: `−${eur(p.cur.rent)}`, c: 'var(--a-orange)', note: 'rate pagate nel periodo' },
            ].map(r => (
              <div key={r.l}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: 'var(--a-dim)' }}>
                  <span>{r.l}</span><strong style={{ color: r.c, whiteSpace: 'nowrap' }}>{r.v}</strong>
                </div>
                {r.note && <div style={{ fontSize: '.64rem', color: 'var(--a-faint)', marginTop: 1 }}>{r.note}</div>}
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--a-line)', paddingTop: 10, marginTop: 2 }}>
              <strong>= Utile netto</strong>
              <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.6rem', color: p.cur.net >= 0 ? 'var(--a-green)' : 'var(--a-red)' }}>{eur(p.cur.net)}</span>
            </div>
            {p.cur.unknownRevenue > 0 ? (
              <div style={{ fontSize: '.72rem', lineHeight: 1.5, color: '#ffb199', background: 'rgba(255,100,100,.07)', border: '1px solid rgba(255,100,100,.3)', borderRadius: 10, padding: '9px 11px' }}>
                ⚠️ <strong>{eur(p.cur.unknownRevenue)}</strong> di vendite sono di prodotti <strong>senza costo d’acquisto</strong>: per quelli l’intero incasso risulta guadagno, quindi l’utile è più alto del reale.
                {stats.missingCost.length > 0 && <> Imposta il costo in <Link href="/admin/products" style={{ color: '#ffb199', fontWeight: 800 }}>Prodotti</Link>: {stats.missingCost.slice(0, 5).map(m => m.name).join(', ')}{stats.missingCost.length > 5 ? ` e altri ${stats.missingCost.length - 5}` : ''}.</>}
              </div>
            ) : (
              <div style={{ fontSize: '.68rem', color: 'var(--a-faint)' }}>✓ Tutti i prodotti venduti nel periodo hanno un costo d’acquisto.</div>
            )}
            <div style={{ fontSize: '.64rem', color: 'var(--a-faint)', lineHeight: 1.5 }}>
              Se il costo di un formato non è impostato si usa quello automatico: Cali €4,2/g · Dry €3,4/g · Frozen €5,5/g · Vapepen €18/pz. Gli ordini annullati non contano.
            </div>
          </div>
        </Card>
      </div>

      <div className="adm-grid two">
        {/* ── Ultimi ordini ── */}
        <Card title="Ultimi ordini" icon="🧾" more={<Link className="more" href="/admin/orders">Tutti ›</Link>}>
          {stats.recentOrders.length === 0 ? <Empty>Nessun ordine</Empty> : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {stats.recentOrders.map((o, i) => {
                const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.pending
                return (
                  <Link key={o.id} href={`/admin/orders?q=${encodeURIComponent(o.id)}`} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px', textDecoration: 'none', color: 'var(--a-text)',
                    borderTop: i ? '1px solid var(--a-line)' : 'none',
                  }}>
                    <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--a-surface-2)' }}>{st.icon}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 700, fontSize: '.84rem' }}>@{o.userId}</span>
                      <span style={{ display: 'block', fontSize: '.68rem', color: 'var(--a-dim)' }}>
                        {new Date(o.createdAt).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · <span style={{ color: st.color }}>{st.short}</span>
                      </span>
                    </span>
                    <strong style={{ fontSize: '.9rem' }}>{eur(o.total)}</strong>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>

        {/* ── Prodotti top ── */}
        <Card title="Prodotti più venduti" icon="🏅">
          {topProducts.length === 0 ? <Empty>Ancora nessuna vendita</Empty> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {topProducts.map((t, i) => (
                <div key={t.name}>
                  <div style={{ display: 'flex', gap: 8, fontSize: '.8rem', marginBottom: 5 }}>
                    <span style={{ color: 'var(--a-faint)', fontWeight: 800 }}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{t.name}</span>
                    <strong>{eur(t.revenue, true)}</strong>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--a-surface-2)', overflow: 'hidden' }}>
                    <div style={{ width: `${(t.revenue / topMax) * 100}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #2fb344, var(--a-green))' }} />
                  </div>
                  <div style={{ fontSize: '.64rem', color: 'var(--a-faint)', marginTop: 3 }}>
                    {t.grams > 0 ? fmtG(t.grams) : `${t.qty} pz`} · {t.ordersCount} ordini{t.margin != null ? ` · margine ${t.margin.toFixed(0)}%` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Dettagli e strumenti (chiusi di default) ── */}
      <details className="adm-card adm-details">
        <summary>📦 Dettaglio vendite per prodotto <span style={{ fontSize: '.7rem', color: 'var(--a-faint)', fontWeight: 600 }}>({stats.productStats.length})</span></summary>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem', minWidth: 560 }}>
            <thead>
              <tr style={{ color: 'var(--a-faint)', textAlign: 'right' }}>
                {['Prodotto', 'Venduto', 'Ordini', 'Fatturato', '€/g', 'Profitto', 'Margine'].map((h, i) => (
                  <th key={h} style={{ padding: '6px 8px', fontWeight: 700, textAlign: i ? 'right' : 'left', borderBottom: '1px solid var(--a-line)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...stats.productStats].sort((a, b) => b.revenue - a.revenue).map(t => (
                <tr key={t.name} style={{ textAlign: 'right' }}>
                  <td style={{ padding: '7px 8px', textAlign: 'left', borderBottom: '1px solid var(--a-line)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--a-line)' }}>{t.grams > 0 ? fmtG(t.grams) : `${t.qty} pz`}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--a-line)' }}>{t.ordersCount}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--a-line)', color: 'var(--a-green)', fontWeight: 700 }}>{eur(t.revenue)}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--a-line)' }}>{t.avgPricePerGram ? eur(t.avgPricePerGram) : '—'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--a-line)' }}>{t.costKnown ? eur(t.profit) : '—'}</td>
                  <td style={{ padding: '7px 8px', borderBottom: '1px solid var(--a-line)', color: 'var(--a-gold)' }}>{t.margin != null ? `${t.margin.toFixed(0)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="adm-card adm-details">
        <summary>🛠️ Strumenti</summary>
        <div className="adm-grid two" style={{ alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontWeight: 800, fontSize: '.84rem' }}>📣 Notifica push a tutti</div>
            <input className="adm-input" placeholder="Titolo" value={pushTitle} onChange={e => setPushTitle(e.target.value)} maxLength={60} />
            <textarea className="adm-input" placeholder="Messaggio" value={pushBody} onChange={e => setPushBody(e.target.value)} rows={2} maxLength={180} style={{ resize: 'vertical' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="adm-btn soft" onClick={sendBroadcast} disabled={!pushTitle.trim() || !pushBody.trim()}>Invia push</button>
              <span style={{ fontSize: '.74rem', color: 'var(--a-dim)' }}>{pushMsg}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontWeight: 800, fontSize: '.84rem' }}>📥 Importa catalogo base</div>
            <div style={{ fontSize: '.72rem', color: 'var(--a-dim)', lineHeight: 1.5 }}>Aggiunge i prodotti del catalogo iniziale. Quelli già presenti vengono saltati.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="adm-btn" onClick={runImport}>Importa</button>
              <span style={{ fontSize: '.74rem', color: 'var(--a-dim)' }}>{importMsg}</span>
            </div>
          </div>
        </div>
      </details>

      <div style={{ fontSize: '.68rem', color: 'var(--a-faint)', textAlign: 'center' }}>
        {stats.orders.total} ordini · {stats.users.total} clienti ({stats.users.week} nuovi in 7 giorni){stats.orders.cancelled ? ` · ${stats.orders.cancelled} annullati` : ''}
      </div>
    </div>
  )
}
