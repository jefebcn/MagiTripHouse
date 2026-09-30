'use client'
import { useEffect, useState } from 'react'
import { useUIStore } from '@/store/uiStore'
import { useProducts, type Product } from '@/hooks/useProducts'
import ProductCard from '@/components/catalog/ProductCard'

interface PublicCode { code: string; percent: number; firstOrderOnly: boolean; origins: string[]; expiresAt: string | null }

const ORIGIN_LABEL: Record<string, string> = { spain: '🇪🇸 Spagna', italy: '🇮🇹 Italia', meetup: '🤝 Meetup', pharma: '💊 Pharma' }
const NEW_DAYS = 14

function SectionTitle({ icon, title, sub, color = 'var(--green)' }: { icon: string; title: string; sub?: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '0 16px', marginBottom: 10 }}>
      <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.08rem', color }}>{icon} {title}</span>
      {sub && <span style={{ fontSize: '.68rem', color: 'var(--muted)' }}>{sub}</span>}
    </div>
  )
}

function Grid({ items }: { items: Product[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 16px' }}>
      {items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
    </div>
  )
}

export default function OffersView() {
  const { view, sessionToken, goToCatalog } = useUIStore()
  const { products, isLoading } = useProducts()
  const [codes, setCodes] = useState<PublicCode[] | null>(null)
  const [hasOrders, setHasOrders] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  // Ricarica a ogni apertura della scheda: i codici si gestiscono da admin
  useEffect(() => {
    if (view !== 'offers') return
    fetch('/api/discount/public').then(r => r.ok ? r.json() : []).then(d => setCodes(Array.isArray(d) ? d : [])).catch(() => setCodes([]))
    if (sessionToken) {
      fetch('/api/orders/mine', { headers: { Authorization: `Bearer ${sessionToken}` } })
        .then(r => r.ok ? r.json() : []).then(d => setHasOrders(Array.isArray(d) && d.length > 0)).catch(() => {})
    }
  }, [view, sessionToken])

  const visibleCodes = (codes ?? []).filter(c => !(c.firstOrderOnly && hasOrders))
  const sellable = products.filter(p => p.category !== 'request' && p.stock !== 0)
  const onSale = sellable.filter(p => p.isOnSale && !p.isComingSoon)
  const fresh = sellable
    .filter(p => !p.isComingSoon && !p.isOnSale && Date.now() - new Date(p.createdAt).getTime() < NEW_DAYS * 86_400_000)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)
  const soon = products.filter(p => p.isComingSoon && p.category !== 'request').slice(0, 4)
  const nothing = !isLoading && codes !== null && !visibleCodes.length && !onSale.length && !fresh.length && !soon.length

  function copy(code: string) {
    navigator.clipboard?.writeText(code).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(c => c === code ? null : c), 1800)
  }

  return (
    <div style={{ paddingBottom: 110 }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 16px' }}>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.6rem', lineHeight: 1.1 }}>
          🔥 <span style={{ background: 'linear-gradient(90deg, #ff8a3d, var(--gold))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Offerte</span>
        </div>
        <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginTop: 4 }}>Codici sconto, prezzi speciali e ultimi arrivi</div>
      </div>

      {/* Codici sconto */}
      {visibleCodes.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SectionTitle icon="🎟️" title="Codici sconto" sub="tocca per copiare" color="var(--gold)" />
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 4px', scrollbarWidth: 'none', scrollSnapType: 'x mandatory', scrollPaddingLeft: 16 }}>
            {visibleCodes.map(c => (
              <button key={c.code} onClick={() => copy(c.code)} style={{
                flex: '0 0 auto', minWidth: 220, scrollSnapAlign: 'start', position: 'relative', overflow: 'hidden',
                display: 'flex', alignItems: 'stretch', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                background: 'linear-gradient(135deg, rgba(245,200,66,.14), rgba(255,138,61,.08))',
                border: '1.5px solid rgba(245,200,66,.45)', borderRadius: 16,
              }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 14px',
                  borderRight: '2px dashed rgba(245,200,66,.4)', minWidth: 78,
                }}>
                  <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem', color: 'var(--gold)', lineHeight: 1 }}>−{c.percent}%</span>
                </div>
                <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '.92rem', letterSpacing: '.08em', color: 'var(--text)' }}>
                    {copied === c.code ? '✓ Copiato!' : c.code}
                  </span>
                  <span style={{ fontSize: '.62rem', color: 'var(--muted)', lineHeight: 1.35 }}>
                    {c.firstOrderOnly ? 'Primo ordine · ' : ''}
                    {c.origins.length ? c.origins.map(o => ORIGIN_LABEL[o] ?? o).join(', ') : 'Tutte le spedizioni'}
                  </span>
                  {c.expiresAt && (
                    <span style={{ fontSize: '.6rem', color: '#ff8a3d', fontWeight: 700 }}>
                      ⏳ fino al {new Date(c.expiresAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: '.64rem', color: 'var(--muted)', padding: '6px 16px 0' }}>Inseriscilo nel carrello, nel campo “Codice sconto”.</div>
        </div>
      )}

      {/* In offerta */}
      {onSale.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SectionTitle icon="💥" title="Prezzi speciali" sub={`${onSale.length} prodott${onSale.length === 1 ? 'o' : 'i'}`} color="#ff8a3d" />
          <Grid items={onSale} />
        </div>
      )}

      {/* Nuovi */}
      {fresh.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SectionTitle icon="✨" title="Appena arrivati" sub={`ultimi ${NEW_DAYS} giorni`} />
          <Grid items={fresh} />
        </div>
      )}

      {/* In arrivo */}
      {soon.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SectionTitle icon="⏳" title="In arrivo" sub="prenota prima che finiscano" color="#7ec8f8" />
          <Grid items={soon} />
        </div>
      )}

      {(isLoading || codes === null) && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.8rem', padding: 30 }}>Caricamento…</div>
      )}

      {nothing && (
        <div style={{ margin: '10px 16px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>🔥</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Nessuna offerta al momento</div>
          <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: 16 }}>Torna presto: le promo cambiano spesso.</div>
          <button onClick={() => goToCatalog({ ship: null })} style={{
            padding: '11px 22px', borderRadius: 12, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer',
            background: 'rgba(61,255,110,.15)', border: '1px solid rgba(61,255,110,.5)', color: 'var(--green)',
          }}>Vai al catalogo ›</button>
        </div>
      )}
    </div>
  )
}
