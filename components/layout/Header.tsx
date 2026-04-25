'use client'
import Image from 'next/image'

export default function Header() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px 16px 8px',
      background: 'var(--bg)',
    }}>
      <Image
        src="/logo.png"
        alt="Magic Trip House"
        width={185}
        height={93}
        style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 18px rgba(61,255,110,.35))' }}
        priority
      />
    </div>
  )
}
