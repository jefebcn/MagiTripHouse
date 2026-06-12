'use client'
import React from 'react'

export default function AnnouncementBanner() {
  const [visible, setVisible] = React.useState(true)

  React.useEffect(() => {
    if (sessionStorage.getItem('ann_v3_dismissed') === '1') setVisible(false)
  }, [])

  if (!visible) return null

  return (
    <div style={{
      margin: '8px 16px 0',
      background: 'linear-gradient(90deg,#1e0e00,#2e1600,#1e0e00)',
      border: '1px solid rgba(255,107,53,.35)',
      borderRadius: 10,
      padding: '8px 12px',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ fontSize: '.9rem', flexShrink: 0 }}>⚠️</span>
      <span style={{ flex: 1, fontSize: '.72rem', color: 'rgba(255,190,100,.85)', lineHeight: 1.4 }}>
        Account Telegram limitato? Salva{' '}
        <strong style={{ color: '#ffcf99' }}>@magichous8</strong>
        {' '}prima di scrivere.
      </span>
      <button
        onClick={() => { sessionStorage.setItem('ann_v3_dismissed', '1'); setVisible(false) }}
        style={{
          background: 'none', border: 'none', color: 'rgba(255,107,53,.5)',
          cursor: 'pointer', fontSize: '.75rem', padding: '2px 4px', flexShrink: 0,
          lineHeight: 1, fontFamily: 'inherit',
        }}
        aria-label="Chiudi"
      >✕</button>
    </div>
  )
}
