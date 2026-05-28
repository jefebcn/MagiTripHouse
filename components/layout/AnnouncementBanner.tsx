'use client'
import React from 'react'

const BANNERS = [
  {
    bg: 'linear-gradient(135deg,#1e0e00 0%,#2e1800 60%,#1e0e00 100%)',
    border: 'rgba(255,107,53,.45)',
    icon: '⚠️',
    title: 'ACCOUNT PRINCIPALE LIMITATO',
    sub: (<>Salva <strong style={{ color: '#ffcf99', fontWeight: 700 }}>@magichous8</strong> per scriverci</>),
    color: 'var(--orange)',
    subColor: 'rgba(255,180,100,.8)',
  },
  {
    bg: 'linear-gradient(135deg,#061a0a 0%,#0d2e14 60%,#061a0a 100%)',
    border: 'rgba(61,255,110,.3)',
    icon: '🚀',
    title: 'SPEDIZIONI RAPIDE IN TUTTA ITALIA',
    sub: '📦 Consegna 24/48h · Packaging discreto 🇮🇹',
    color: '#7dffa4',
    subColor: 'rgba(125,255,164,.7)',
  },
]

export default function AnnouncementBanner() {
  const [dismissed, setDismissed] = React.useState(false)
  const [active, setActive] = React.useState(0)

  React.useEffect(() => {
    if (sessionStorage.getItem('ann_v2_dismissed') === '1') setDismissed(true)
  }, [])

  function dismiss() {
    sessionStorage.setItem('ann_v2_dismissed', '1')
    setDismissed(true)
  }

  if (dismissed) {
    return (
      <div style={{ padding: '4px 16px 10px', display: 'flex', gap: 6 }}>
        {BANNERS.map((b, i) => (
          <button
            key={i}
            onClick={() => { setDismissed(false); sessionStorage.removeItem('ann_v2_dismissed'); setActive(i) }}
            style={{
              background: 'var(--bg3)', border: `1px solid ${b.border}`,
              borderRadius: 20, padding: '4px 11px',
              fontSize: '.68rem', color: b.color, cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {b.icon} <span style={{ fontWeight: 600 }}>{i === 0 ? 'Avviso' : 'Spedizioni'}</span>
          </button>
        ))}
      </div>
    )
  }

  const b = BANNERS[active]

  return (
    <div style={{ padding: '10px 16px 4px' }}>
      <div style={{
        borderRadius: 14, overflow: 'hidden',
        border: `1px solid ${b.border}`,
        boxShadow: `0 2px 20px rgba(0,0,0,.2)`,
      }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,.35)', borderBottom: `1px solid ${b.border}` }}>
          {BANNERS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                flex: 1, padding: '7px 0',
                background: active === i ? tab.bg : 'transparent',
                border: 'none', cursor: 'pointer',
                fontSize: '.72rem', fontWeight: active === i ? 700 : 400,
                color: active === i ? tab.color : 'var(--muted)',
                fontFamily: 'inherit', transition: '.18s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <span>{tab.icon}</span>
              <span style={{ fontSize: '.65rem', letterSpacing: '.2px' }}>
                {i === 0 ? 'Avviso' : 'Spedizioni'}
              </span>
              {active === i && (
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: tab.color, boxShadow: `0 0 6px ${tab.color}` }} />
              )}
            </button>
          ))}
          <button
            onClick={dismiss}
            style={{
              background: 'none', border: 'none', color: 'rgba(106,138,106,.5)',
              cursor: 'pointer', padding: '0 12px', fontSize: '.8rem',
              transition: '.15s',
            }}
            title="Chiudi avvisi"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{
          background: b.bg, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.02),transparent)',
            animation: 'shimmer 4s ease infinite',
          }} />
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{b.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '.79rem', color: b.color, letterSpacing: '.4px' }}>
              {b.title}
            </div>
            <div style={{ fontSize: '.7rem', color: b.subColor, marginTop: 3 }}>
              {b.sub}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
