'use client'
import Image from 'next/image'
import { useUIStore } from '@/store/uiStore'
import { useProducts, type Product } from '@/hooks/useProducts'
import ProductCard from '@/components/catalog/ProductCard'

// Grammi dal label del formato ("5g", "1kg", "100 g", "10"); 0 se non è a peso (pezzi, ml…)
function grams(label: string): number {
  const t = label.trim().toLowerCase().replace(',', '.')
  const m = t.match(/^(\d+(?:\.\d+)?)\s*(kg|g|gr)?$/)
  if (!m) return 0
  const n = parseFloat(m[1])
  return m[2] === 'kg' ? n * 1000 : n
}

// Risparmio al grammo fra formato più piccolo e più grande
function volumeSaving(p: Product) {
  const vs = (p.variants ?? []).map(v => ({ label: v.label, g: grams(v.label), price: v.price })).filter(v => v.g > 0 && v.price > 0).sort((a, b) => a.g - b.g)
  if (vs.length < 2) return null
  const first = vs[0], last = vs[vs.length - 1]
  const from = first.price / first.g, to = last.price / last.g
  const saving = Math.round((1 - to / from) * 100)
  return saving >= 5 ? { p, from, to, saving, fromLabel: first.label, toLabel: last.label } : null
}
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
  const { goToCatalog, setDetailProduct } = useUIStore()
  const { products, isLoading } = useProducts()

  const sellable = products.filter(p => p.category !== 'request' && p.stock !== 0)
  const onSale = sellable.filter(p => p.isOnSale && !p.isComingSoon)
  const fresh = sellable
    .filter(p => !p.isComingSoon && !p.isOnSale && Date.now() - new Date(p.createdAt).getTime() < NEW_DAYS * 86_400_000)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)
  const soon = products.filter(p => p.isComingSoon && p.category !== 'request').slice(0, 4)
  const volume = sellable.filter(p => !p.isComingSoon).map(volumeSaving).filter((v): v is NonNullable<typeof v> => !!v)
    .sort((a, b) => b.saving - a.saving).slice(0, 6)
  const nothing = !isLoading && !volume.length && !onSale.length && !fresh.length && !soon.length

  return (
    <div style={{ paddingBottom: 110 }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 16px' }}>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.6rem', lineHeight: 1.1 }}>
          🔥 <span style={{ background: 'linear-gradient(90deg, #ff8a3d, var(--gold))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Offerte</span>
        </div>
        <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginTop: 4 }}>Prezzi speciali, risparmio a volume e ultimi arrivi</div>
      </div>

      {/* Più prendi, meno paghi: risparmio a volume (nessun coupon) */}
      {volume.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <SectionTitle icon="📦" title="Più prendi, meno paghi" sub="risparmio al grammo" color="var(--gold)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px' }}>
            {volume.map(v => (
              <button key={v.p.id} onClick={() => setDetailProduct(v.p)} style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 10, color: 'var(--text)',
              }}>
                <div style={{ position: 'relative', width: 56, height: 56, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {v.p.imageUrl && v.p.mediaType !== 'video'
                    ? <Image src={v.p.imageUrl} alt={v.p.name} fill sizes="56px" style={{ objectFit: 'cover' }} />
                    : <span style={{ fontSize: '1.6rem' }}>{v.p.emoji}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.p.name}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 2 }}>
                    {v.fromLabel}: €{v.from.toFixed(2)}/g → <strong style={{ color: 'var(--green)' }}>{v.toLabel}: €{v.to.toFixed(2)}/g</strong>
                  </div>
                </div>
                <span style={{
                  flexShrink: 0, fontFamily: "'Fredoka One', cursive", fontSize: '.95rem', color: '#041004',
                  background: 'linear-gradient(135deg, var(--gold), #ff9a3d)', borderRadius: 10, padding: '5px 8px',
                }}>−{v.saving}%</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: '.64rem', color: 'var(--muted)', padding: '6px 16px 0' }}>Risparmio al grammo tra il formato più piccolo e il più grande.</div>
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

      {isLoading && (
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
