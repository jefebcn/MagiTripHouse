import { SessionProvider } from 'next-auth/react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div style={{ minHeight: '100dvh', background: 'var(--bg)', color: 'var(--text)' }}>
        {children}
      </div>
    </SessionProvider>
  )
}
