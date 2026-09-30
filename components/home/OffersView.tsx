'use client'
import { useEffect, useState } from 'react'
import { useUIStore } from '@/store/uiStore'
import PartnerReward from './PartnerReward'

interface Code {
  code: string; title: string | null; percent: number; maxDiscount: number | null; minOrder: number | null
  origins: string[]; firstOrderOnly: boolean; expiresAt: string | null
}

const ORIGIN_LABEL: Record<string, string> = { spain: '🇪🇸 Spagna', italy: '🇮🇹 Italia', meetup: '🤝 Meetup', pharma: '💊 Pharma' }
const eur = (n: number) => `€${Number.isInteger(n) ? n : n.toFixed(2)}`

export default function OffersView() {
  const { view, sessionToken, setCartOpen } = useUIStore()
  const [codes, setCodes] = useState<Code[] | null>(null)
  const [hasOrders, setHasOrders] = useState(false)
  const [used, setUsed] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  // Ricarica a ogni apertura: i codici si gestiscono dal pannello admin
  useEffect(() => {
    if (view !== 'offers') return
    fetch('/api/discount/public').then(r => r.ok ? r.json() : []).then(d => setCodes(Array.isArray(d) ? d : [])).catch(() => setCodes([]))
    if (sessionToken) {
      fetch('/api/orders/mine', { headers: { Authorization: `Bearer ${sessionToken}` } })
        .then(r => r.ok ? r.json() : []).then(d => setHasOrders(Array.isArray(d) && d.length > 0)).catch(() => {})
      fetch('/api/discount/used', { headers: { Authorization: `Bearer ${sessionToken}` } })
        .then(r => r.ok ? r.json() : []).then(d => setUsed(Array.isArray(d) ? d : [])).catch(() => {})
    }
  }, [view, sessionToken])

  // I codici "primo ordine" non servono a chi ha già ordinato
  const visible = (codes ?? []).filter(c => !(c.firstOrderOnly && hasOrders))

  function copy(code: string) {
    navigator.clipboard?.writeText(code).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(c => c === code ? null : c), 1800)
  }

  return (
    <div style={{ padding: '20px 16px 110px' }}>
      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.6rem', lineHeight: 1.1 }}>
        🔥 <span style={{ background: 'linear-gradient(90deg, #ff8a3d, var(--gold))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Offerte</span>
      </div>
      <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
        Codici sconto da inserire nel carrello. Ogni codice ha uno <strong style={{ color: 'var(--text)' }}>sconto massimo in €</strong>. Ogni codice si usa <strong style={{ color: 'var(--text)' }}>una sola volta</strong>, un codice per ordine.
      </div>

      {/* Premio personale per chi compra su KratosLabs: in evidenza in cima */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.05rem', color: '#c7d2fe', marginBottom: 8 }}>🎁 Coupon KratosLabs</div>
        <PartnerReward compact />
      </div>

      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.05rem', color: 'var(--gold)', marginTop: 22 }}>🎟️ Codici sconto</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
        {visible.map(c => {
          const isCopied = copied === c.code
          const isUsed = used.includes(c.code)
          const conditions = [
            c.firstOrderOnly ? 'Solo primo ordine' : null,
            c.minOrder != null ? `Ordine minimo ${eur(c.minOrder)}` : null,
            c.origins.length ? c.origins.map(o => ORIGIN_LABEL[o] ?? o).join(' · ') : 'Tutte le spedizioni',
            c.expiresAt ? `Fino al ${new Date(c.expiresAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}` : null,
          ].filter(Boolean) as string[]
          return (
            <div key={c.code} style={{
              position: 'relative', display: 'flex', overflow: 'hidden', borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(245,200,66,.12), rgba(255,138,61,.06) 60%, var(--card))',
              border: '1.5px solid rgba(245,200,66,.4)',
              opacity: isUsed ? .45 : 1, filter: isUsed ? 'grayscale(.8)' : 'none',
            }}>
              {/* Valore */}
              <div style={{
                width: 96, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '14px 6px', borderRight: '2px dashed rgba(245,200,66,.35)', textAlign: 'center',
              }}>
                <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.7rem', color: 'var(--gold)', lineHeight: 1 }}>−{c.percent}%</span>
                {c.maxDiscount != null && (
                  <span style={{ marginTop: 6, fontSize: '.66rem', fontWeight: 800, color: '#041004', background: 'linear-gradient(135deg, var(--gold), #ff9a3d)', borderRadius: 8, padding: '3px 7px' }}>
                    max {eur(c.maxDiscount)}
                  </span>
                )}
              </div>
              {/* Dettagli + copia */}
              <div style={{ flex: 1, minWidth: 0, padding: '12px 12px 12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {c.title && <div style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{c.title}</div>}
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '.06em', color: 'var(--text)' }}>{c.code}</div>
                <div style={{ fontSize: '.68rem', color: 'var(--muted)', lineHeight: 1.45 }}>
                  {c.maxDiscount != null
                    ? <>Scala fino a <strong style={{ color: 'var(--gold)' }}>{eur(c.maxDiscount)}</strong> dal totale</>
                    : <>Sconto del {c.percent}% sul totale prodotti</>}
                </div>
                <div style={{ fontSize: '.64rem', color: 'rgba(237,250,238,.6)', lineHeight: 1.45 }}>{conditions.join(' · ')}</div>
                {isUsed ? (
                  <span style={{ marginTop: 6, alignSelf: 'flex-start', padding: '7px 14px', borderRadius: 10, fontSize: '.74rem', fontWeight: 800, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--muted)' }}>✓ Già usato</span>
                ) : (
                <button onClick={() => copy(c.code)} style={{
                  marginTop: 6, alignSelf: 'flex-start', padding: '7px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '.74rem', fontWeight: 800,
                  background: isCopied ? 'rgba(61,255,110,.18)' : 'rgba(245,200,66,.14)',
                  border: `1px solid ${isCopied ? 'rgba(61,255,110,.5)' : 'rgba(245,200,66,.5)'}`,
                  color: isCopied ? 'var(--green)' : 'var(--gold)',
                }}>{isCopied ? '✓ Copiato' : '📋 Copia codice'}</button>
                )}
              </div>
            </div>
          )
        })}

        {codes === null && <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.8rem', padding: 24 }}>Caricamento…</div>}
        {codes !== null && visible.length === 0 && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 18px', textAlign: 'center', color: 'var(--muted)', fontSize: '.82rem' }}>
            Nessun codice attivo al momento. Torna presto!
          </div>
        )}

      </div>

      {visible.length > 0 && (
        <div style={{ marginTop: 18, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', fontSize: '.72rem', color: 'var(--muted)', lineHeight: 1.55 }}>
          <strong style={{ color: 'var(--text)' }}>Come si usa:</strong> copia il codice, apri il carrello e incollalo nel campo “🎟 Codice sconto”, poi premi Applica.
          <button onClick={() => setCartOpen(true)} style={{
            display: 'block', marginTop: 10, width: '100%', padding: '10px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
            fontWeight: 700, fontSize: '.8rem', background: 'rgba(61,255,110,.12)', border: '1px solid rgba(61,255,110,.4)', color: 'var(--green)',
          }}>🛒 Apri il carrello</button>
        </div>
      )}
    </div>
  )
}
