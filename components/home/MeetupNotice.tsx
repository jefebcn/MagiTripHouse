'use client'
import { useUIStore } from '@/store/uiStore'
import { useProducts } from '@/hooks/useProducts'

// Avviso di stop ai meetup: mostrato in cima alla home appena si entra nell'app.
// I prodotti ancora disponibili di persona sono quelli con spedizione "Solo di persona" (meetup) nel pannello admin.
export default function MeetupNotice() {
  const { isLoggedIn, setDetailProduct } = useUIStore()
  const { products, isLoading } = useProducts()
  const meetup = products.filter(p => p.shipFrom === 'meetup' && p.category !== 'request' && !p.hidden)

  return (
    <div style={{ padding: '14px 16px 0' }}>
      <div role="alert" style={{
        borderRadius: 16, padding: '14px 14px 13px',
        background: 'linear-gradient(135deg, #b91c1c 0%, #e83b3b 100%)',
        border: '1.5px solid #ff6b6b', color: '#fff',
        boxShadow: '0 0 24px rgba(232,59,59,.35)',
      }}>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.08rem', lineHeight: 1.2 }}>
          ⚠️ Stop ai meetup
        </div>
        <div style={{ fontSize: '.8rem', lineHeight: 1.5, marginTop: 6 }}>
          Non facciamo più meetup.{' '}
          {isLoading || meetup.length > 0
            ? <>Di persona restano disponibili <strong>solo {meetup.length === 1 ? 'questo prodotto' : meetup.length > 1 ? `questi ${meetup.length} prodotti` : 'pochi prodotti'}</strong> del menu:</>
            : <>Tutti i prodotti si ordinano <strong>solo con spedizione</strong>.</>}
        </div>

        {meetup.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {meetup.map(p => (
              <button
                key={p.id}
                onClick={() => isLoggedIn && setDetailProduct(p)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999,
                  background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.45)', color: '#fff',
                  fontFamily: 'inherit', fontSize: '.74rem', fontWeight: 800, cursor: isLoggedIn ? 'pointer' : 'default',
                }}
              >{p.emoji} {p.name}</button>
            ))}
          </div>
        )}

        {meetup.length > 0 && (
          <div style={{ fontSize: '.8rem', lineHeight: 1.5, marginTop: 8 }}>
            Tutto il resto si ordina <strong>solo con spedizione</strong> 📦 a casa o in locker.
          </div>
        )}
      </div>
    </div>
  )
}
