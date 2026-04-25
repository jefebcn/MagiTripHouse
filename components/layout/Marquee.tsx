'use client'

const ITEMS = [
  '🚀 Spedizioni in tutta Italia',
  '📦 Packaging discreto',
  '💎 Qualità premium garantita',
  '🇮🇹 100% Made for Italy',
  '✅ Affidabile dal 2020',
  '🔒 Ordini sicuri al 100%',
  '🌿 Prodotti testati in lab',
  '⚡ Spedizione rapida 24/48h',
]

export default function Marquee() {
  const doubled = [...ITEMS, ...ITEMS]
  return (
    <div style={{
      overflow: 'hidden', background: 'var(--bg3)',
      borderTop: '1px solid rgba(61,255,110,.12)',
      borderBottom: '1px solid rgba(61,255,110,.12)',
      padding: '7px 0',
    }}>
      <div style={{ display: 'flex', gap: 40, animation: 'marquee 18s linear infinite', whiteSpace: 'nowrap' }}>
        {doubled.map((item, i) => (
          <span key={i} style={{ fontSize: '.72rem', color: 'var(--muted)', letterSpacing: '.3px' }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
