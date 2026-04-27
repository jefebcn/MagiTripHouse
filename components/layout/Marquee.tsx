'use client'

const ITEMS = [
  { text: '🚀 Spedizioni in tutta Italia', gold: false },
  { text: '📦 Packaging discreto garantito', gold: false },
  { text: '💎 Qualità premium certificata', gold: true },
  { text: '🇮🇹 100% Made for Italy', gold: false },
  { text: '✅ Affidabili dal 2020', gold: false },
  { text: '🔒 Ordini sicuri al 100%', gold: true },
  { text: '🌿 Prodotti testati in laboratorio', gold: false },
  { text: '⚡ Consegna rapida 24/48h', gold: true },
]

const SEP = <span style={{ color: 'rgba(61,255,110,.25)', margin: '0 6px' }}>✦</span>

export default function Marquee() {
  const doubled = [...ITEMS, ...ITEMS]
  return (
    <div style={{
      overflow: 'hidden',
      background: 'linear-gradient(90deg,var(--bg3),#0f1a0f,var(--bg3))',
      borderTop: '1px solid rgba(61,255,110,.18)',
      borderBottom: '1px solid rgba(61,255,110,.18)',
      padding: '8px 0',
    }}>
      <div style={{ display: 'flex', gap: 0, animation: 'marquee 22s linear infinite', whiteSpace: 'nowrap', alignItems: 'center' }}>
        {doubled.map((item, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span style={{
              fontSize: '.74rem', letterSpacing: '.4px', fontWeight: 500,
              color: item.gold ? 'rgba(245,200,66,.85)' : 'rgba(61,255,110,.75)',
            }}>
              {item.text}
            </span>
            {SEP}
          </span>
        ))}
      </div>
    </div>
  )
}
