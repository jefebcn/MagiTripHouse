'use client'
import { useCallback, useEffect, useState } from 'react'
import { useUIStore } from '@/store/uiStore'

interface State {
  reward: { percent: number; maxDiscount: number; validDays: number }
  claim: { status: 'pending' | 'approved' | 'rejected'; partnerOrder: string; code: string | null; used: boolean } | null
}

// Premio partner: acquisto su KratosLabs → coupon personale più alto su MagicTripHouse (verificato dall'admin)
export default function PartnerReward({ compact = false }: { compact?: boolean }) {
  const { sessionToken, view } = useUIStore()
  // Stato iniziale = invito: la card è visibile subito, poi si aggiorna con la risposta del server
  const [data, setData] = useState<State>({ reward: { percent: 15, maxDiscount: 50, validDays: 30 }, claim: null })
  const [open, setOpen] = useState(false)
  const [order, setOrder] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(() => {
    if (!sessionToken) return
    fetch('/api/partner/claim', { headers: { Authorization: `Bearer ${sessionToken}` } })
      .then(r => r.ok ? r.json() : null).then(d => d && setData(d)).catch(() => {})
  }, [sessionToken])

  // Ricarica quando si torna su home/offerte (l'admin potrebbe aver approvato nel frattempo)
  useEffect(() => { if (view === 'hub' || view === 'offers') load() }, [view, load])

  async function submit() {
    setError('')
    if (order.trim().length < 3) return setError('Inserisci il numero d’ordine KratosLabs')
    setSending(true)
    const res = await fetch('/api/partner/claim', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify({ partnerOrder: order }),
    })
    const d = await res.json().catch(() => ({}))
    setSending(false)
    if (!res.ok) return setError(d.error ?? 'Errore, riprova')
    setOpen(false); setOrder(''); load()
  }

  const { reward, claim } = data
  if (claim?.status === 'approved' && claim.used) return null

  const box: React.CSSProperties = {
    marginTop: compact ? 0 : 10, borderRadius: 16, padding: '12px 14px',
    background: 'linear-gradient(135deg, rgba(129,140,248,.14), rgba(245,200,66,.08))',
    border: '1px solid rgba(165,180,252,.35)',
  }
  const offer = `−${reward.percent}% (max €${reward.maxDiscount})`

  // Coupon sbloccato
  if (claim?.status === 'approved' && claim.code) {
    return (
      <div style={box}>
        <div style={{ fontWeight: 800, fontSize: '.86rem', color: 'var(--gold)' }}>🎁 Premio partner sbloccato!</div>
        <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 2 }}>Coupon personale {offer} · monouso · valido {reward.validDays} giorni</div>
        <button onClick={() => { navigator.clipboard?.writeText(claim.code!).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800) }} style={{
          marginTop: 10, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(8,12,8,.5)', border: '1.5px dashed rgba(245,200,66,.6)', borderRadius: 12, padding: '10px 12px',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, letterSpacing: '.08em', color: 'var(--gold)' }}>{claim.code}</span>
          <span style={{ fontSize: '.7rem', fontWeight: 700, color: copied ? 'var(--green)' : 'var(--muted)' }}>{copied ? '✓ copiato' : '📋 copia'}</span>
        </button>
        <div style={{ fontSize: '.64rem', color: 'var(--muted)', marginTop: 6 }}>Inseriscilo nel carrello, nel campo “Codice sconto”.</div>
      </div>
    )
  }

  // In verifica
  if (claim?.status === 'pending') {
    return (
      <div style={box}>
        <div style={{ fontWeight: 800, fontSize: '.84rem', color: '#a5b4fc' }}>⏳ Stiamo verificando il tuo ordine KratosLabs</div>
        <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 3 }}>
          Ordine <strong style={{ fontFamily: 'monospace' }}>{claim.partnerOrder}</strong> · appena confermato ricevi il coupon {offer}
        </div>
      </div>
    )
  }

  // Invito (nessuna richiesta o richiesta rifiutata)
  return (
    <div style={box}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none',
        padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', color: 'var(--text)',
      }}>
        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🎁</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '.84rem' }}>Hai comprato su KratosLabs?</div>
          <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 2 }}>
            Sblocca un coupon <strong style={{ color: 'var(--gold)' }}>{offer}</strong> da usare qui
          </div>
        </div>
        <span style={{ color: 'var(--muted)', transform: open ? 'rotate(90deg)' : 'none', transition: '.2s' }}>›</span>
      </button>

      {claim?.status === 'rejected' && !open && (
        <div style={{ fontSize: '.68rem', color: '#ff8c66', marginTop: 8 }}>La richiesta per l’ordine {claim.partnerOrder} non è stata confermata. Puoi inviarne un’altra.</div>
      )}

      {open && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: '.7rem', color: 'var(--muted)', lineHeight: 1.45 }}>
            Inserisci il numero dell’ordine che hai fatto su kratoslabs.shop: lo verifichiamo e ti inviamo il coupon personale.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={order} onChange={e => { setOrder(e.target.value); setError('') }} placeholder="N° ordine KratosLabs"
              style={{ flex: 1, minWidth: 0, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', color: 'var(--text)', fontSize: '.84rem', fontFamily: 'inherit', outline: 'none', textTransform: 'uppercase' }} />
            <button onClick={submit} disabled={sending} style={{
              padding: '10px 14px', borderRadius: 10, fontFamily: 'inherit', fontWeight: 700, fontSize: '.8rem', cursor: 'pointer',
              background: 'rgba(165,180,252,.15)', border: '1px solid rgba(165,180,252,.5)', color: '#c7d2fe',
            }}>{sending ? '…' : 'Invia'}</button>
          </div>
          {error && <div style={{ fontSize: '.7rem', color: 'var(--red)' }}>{error}</div>}
        </div>
      )}
    </div>
  )
}
