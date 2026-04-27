'use client'
import Image from 'next/image'

export default function Header() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '18px 16px 8px',
      background: 'var(--bg)',
    }}>
      <Image
        src="/logo.png"
        alt="Magic Trip House"
        width={175}
        height={88}
        style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 24px rgba(61,255,110,.42))' }}
        priority
      />
    </div>
  )
}
