'use client'

const ITEMS = [
  { text: '🚀 Spedizioni in tutta Italia ed Europa', gold: false },
  { text: '📦 Packaging discreto garantito', gold: false },
  { text: '💎 Qualità premium certificata', gold: true },
  { text: '💳 Pagamenti Crypto o IBAN', gold: false },
  { text: '📅 Spedizioni dal Lunedì al Mercoledì', gold: true },
  { text: '🔒 Ordini sicuri al 100%', gold: false },
  { text: '🌿 Prodotti testati in laboratorio', gold: false },
  { text: '📍 Tracking ITA 24–48h · ESP 48–72h', gold: true },
]

const SEP = <span style={{ color: 'rgba(61,255,110,.25)', margin: '0 6px' }}>✦</span>

export default function Marquee() {
  const doubled = [...ITEMS, ...ITEMS]
  return (
    <div style={{
      overflow: 'hidden',
      background: 'linear-gradient(90deg,var(--bg3),#0f1a0f,var(--bg3))',
      borderTop: '1px solid rgba(61,255,110,.12)',
      borderBottom: '1px solid rgba(61,255,110,.12)',
      padding: '5px 0',
    }}>
      <div style={{ display: 'flex', gap: 0, animation: 'marquee 22s linear infinite', whiteSpace: 'nowrap', alignItems: 'center' }}>
        {doubled.map((item, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span style={{
              fontSize: '.68rem', letterSpacing: '.3px', fontWeight: 500,
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
