'use client'

export default function AnnouncementBanner() {
  return (
    <>
      {/* Shipping */}
      <a
        href="https://t.me/+x-k20v41qKk0NGJk"
        target="_blank"
        rel="noopener"
        style={{
          margin: '16px 16px 0', borderRadius: 'var(--radius)', padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, fontSize: '.88rem',
          textDecoration: 'none', overflow: 'hidden', position: 'relative',
          background: 'linear-gradient(135deg,#0d1a2e,#0a1525)',
          border: '1px solid rgba(59,130,246,.45)', color: '#7ab8f5',
          boxShadow: '0 0 22px rgba(59,130,246,.12)',
          cursor: 'pointer', transition: '.18s',
        }}
      >
        <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>📢</span>
        <div style={{ flex: 1 }}>
          <div>ACCEDI AL NUOVO CANALE PRINCIPALE</div>
          <div style={{ fontSize: '.72rem', fontWeight: 400, opacity: .85, marginTop: 2 }}>
            Tocca per entrare nel canale ufficiale aggiornato →
          </div>
        </div>
        <span style={{ fontSize: '1.3rem', marginLeft: 'auto', opacity: .8 }}>✈️</span>
      </a>

      {/* Disclaimer */}
      <div style={{
        margin: '8px 16px 0', borderRadius: 'var(--radius)', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, fontSize: '.88rem',
        background: 'linear-gradient(135deg,#1e0e00,#2e1500)',
        border: '1px solid rgba(255,107,53,.35)', color: 'var(--orange)',
      }}>
        <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>⚠️</span>
        <div>
          <div>ACCOUNT PRINCIPALE LIMITATO</div>
          <div style={{ fontSize: '.72rem', fontWeight: 400, opacity: .85, marginTop: 2 }}>
            Per scriverci salva prima il contatto{' '}
            <strong style={{ color: '#ffcf99' }}>@magichous8</strong>
          </div>
        </div>
      </div>

      {/* Shipping info */}
      <div style={{
        margin: '8px 16px 0', borderRadius: 'var(--radius)', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, fontSize: '.88rem',
        background: 'linear-gradient(135deg,#0a1f0e,#0d2e14)',
        border: '1px solid rgba(61,255,110,.3)', color: '#7dffa4',
        position: 'relative', overflow: 'hidden',
      }}>
        <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>🚀</span>
        <div>
          <div>SPEDIZIONI RAPIDE IN TUTTA ITALIA</div>
          <div style={{ fontSize: '.72rem', fontWeight: 400, opacity: .85, marginTop: 2 }}>
            📦 Consegna in 24/48h · Packaging discreto garantito 🇮🇹
          </div>
        </div>
      </div>
    </>
  )
}
