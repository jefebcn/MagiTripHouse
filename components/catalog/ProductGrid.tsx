'use client'
import { useProducts } from '@/hooks/useProducts'
import { useUIStore } from '@/store/uiStore'
import ProductCard from './ProductCard'

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <div className="skeleton-shine" style={{ paddingBottom: '100%' }} />
      <div style={{ padding: 11, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton-shine" style={{ height: 10, borderRadius: 5 }} />
        <div className="skeleton-shine" style={{ height: 10, borderRadius: 5, width: '60%' }} />
      </div>
    </div>
  )
}

export default function ProductGrid() {
  const { products, isLoading } = useProducts()
  const { filter, search, setFilter, setSearch } = useUIStore()

  const filtered = products.filter((p) => {
    const matchCat = filter === 'all' || p.category === filter || p.badge === filter
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q) ||
      (p.origin ?? '').toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    return matchCat && matchSearch
  })

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 16px 100px' }}>
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (!filtered.length) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '48px 24px' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
        <div style={{ fontSize: '.9rem', marginBottom: 16 }}>Nessun prodotto trovato</div>
        <button
          onClick={() => { setFilter('all'); setSearch('') }}
          style={{
            background: 'rgba(61,255,110,.1)', border: '1px solid rgba(61,255,110,.3)',
            color: 'var(--green)', borderRadius: 20, padding: '8px 20px',
            fontFamily: 'inherit', fontSize: '.82rem', cursor: 'pointer',
          }}
        >
          Cancella filtri
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 16px 100px' }}>
      {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
    </div>
  )
}
