import Link from 'next/link'
import { signOut } from '@/lib/auth'

const SECTIONS = [
  { href: '/admin/products',   icon: '📦', title: 'Prodotti',  desc: 'Aggiungi, modifica, elimina prodotti' },
  { href: '/admin/orders',     icon: '📋', title: 'Ordini',    desc: 'Gestisci gli ordini ricevuti' },
  { href: '/admin/news',       icon: '📢', title: 'Novità',    desc: 'Pubblica aggiornamenti e news' },
  { href: '/admin/affiliates', icon: '👥', title: 'Affiliati', desc: 'Elenco referral e codici' },
]

export default function AdminDashboard() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem' }}>
          ⚙️ Admin Panel
        </div>
        <form action={async () => {
          'use server'
          const { signOut: so } = await import('@/lib/auth')
          await so({ redirectTo: '/admin/login' })
        }}>
          <button
            type="submit"
            style={{
              background: 'var(--bg3)', border: '1px solid var(--border)',
              color: 'var(--muted)', borderRadius: 8, padding: '6px 14px',
              fontSize: '.78rem', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Esci
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '16px 18px',
              display: 'flex', alignItems: 'center', gap: 14,
              transition: '.2s', cursor: 'pointer',
            }}>
              <span style={{ fontSize: '1.4rem', width: 32, textAlign: 'center' }}>{s.icon}</span>
              <div>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.95rem' }}>{s.title}</div>
                <div style={{ color: 'var(--muted)', fontSize: '.75rem', marginTop: 2 }}>{s.desc}</div>
              </div>
              <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
