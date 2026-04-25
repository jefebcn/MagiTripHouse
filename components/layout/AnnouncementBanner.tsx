'use client'

export default function AnnouncementBanner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px 0' }}>

      {/* Disclaimer account limitato */}
      <div style={{
        borderRadius: 'var(--radius)', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(135deg,#1e0e00,#2e1500)',
        border: '1px solid rgba(255,107,53,.35)', color: 'var(--orange)',
      }}>
        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>⚠️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '.87rem' }}>ACCOUNT PRINCIPALE LIMITATO</div>
          <div style={{ fontSize: '.72rem', fontWeight: 400, opacity: .85, marginTop: 3 }}>
            Per scriverci salva prima il contatto{' '}
            <strong style={{ color: '#ffcf99' }}>@magichous8</strong>
          </div>
        </div>
      </div>

      {/* Spedizioni */}
      <div style={{
        borderRadius: 'var(--radius)', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'linear-gradient(135deg,#0a1f0e,#0d2e14)',
        border: '1px solid rgba(61,255,110,.3)', color: '#7dffa4',
      }}>
        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🚀</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '.87rem' }}>SPEDIZIONI RAPIDE IN TUTTA ITALIA</div>
          <div style={{ fontSize: '.72rem', fontWeight: 400, opacity: .85, marginTop: 3 }}>
            📦 Consegna in 24/48h · Packaging discreto garantito 🇮🇹
          </div>
        </div>
      </div>

    </div>
  )
}
