'use client'

export default function AnnouncementBanner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 16px' }}>

      {/* Disclaimer account limitato */}
      <div style={{
        borderRadius: 12, padding: '11px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(135deg,#1e0e00 0%,#2e1800 50%,#1e0e00 100%)',
        border: '1px solid rgba(255,107,53,.4)',
        boxShadow: '0 2px 16px rgba(255,107,53,.08), inset 0 0 20px rgba(255,107,53,.03)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(90deg,transparent 0%,rgba(255,107,53,.06) 50%,transparent 100%)',
          animation: 'shimmer 3s ease infinite',
        }} />
        <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>⚠️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '.82rem', color: 'var(--orange)', letterSpacing: '.3px' }}>
            ACCOUNT PRINCIPALE LIMITATO
          </div>
          <div style={{ fontSize: '.71rem', fontWeight: 400, color: 'rgba(255,180,100,.75)', marginTop: 2 }}>
            Salva il contatto{' '}
            <strong style={{ color: '#ffcf99', fontWeight: 700 }}>@magichous8</strong>
            {' '}per scriverci
          </div>
        </div>
      </div>

      {/* Spedizioni */}
      <div style={{
        borderRadius: 12, padding: '11px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(135deg,#061a0a 0%,#0d2e14 50%,#061a0a 100%)',
        border: '1px solid rgba(61,255,110,.28)',
        boxShadow: '0 2px 16px rgba(61,255,110,.06), inset 0 0 20px rgba(61,255,110,.02)',
      }}>
        <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>🚀</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '.82rem', color: '#7dffa4', letterSpacing: '.3px' }}>
            SPEDIZIONI RAPIDE IN TUTTA ITALIA
          </div>
          <div style={{ fontSize: '.71rem', fontWeight: 400, color: 'rgba(125,255,164,.65)', marginTop: 2 }}>
            📦 Consegna 24/48h · Packaging discreto 🇮🇹
          </div>
        </div>
      </div>

    </div>
  )
}
