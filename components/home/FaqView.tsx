'use client'
import { useUIStore } from '@/store/uiStore'

const STEPS = [
  { icon: '🛒', title: '1 · Scegli e ordina', text: 'Aggiungi i prodotti al carrello, seleziona il metodo di pagamento (Crypto o IBAN) e invia l’ordine. Ti si apre Telegram con il riepilogo.' },
  { icon: '💳', title: '2 · Paga in anticipo', text: 'Ti inviamo su Telegram i dati per il pagamento (wallet crypto o IBAN). Gli ordini partono dopo aver ricevuto il pagamento — è il modello che ci permette di offrirti prezzi competitivi senza magazzino.' },
  { icon: '📦', title: '3 · Spedizione', text: 'Una volta ricevuto il pagamento, prepariamo il pacco con packaging discreto. Le spedizioni partono dal Lunedì al Mercoledì.' },
  { icon: '📍', title: '4 · Tracking', text: 'Ricevi il numero di tracciamento: entro 24–48 ore per l’Italia, 48–72 ore per la Spagna. Lo trovi anche nella sezione “I miei ordini”.' },
]

const FAQS = [
  { q: 'Perché il pagamento è anticipato?', a: 'Lavoriamo senza magazzino: ordiniamo su misura per te. Il pagamento anticipato ci permette di tenere i prezzi bassi e garantire sempre prodotto fresco.' },
  { q: 'Quali metodi di pagamento accettate?', a: 'Crypto (consigliato, più veloce e discreto) oppure bonifico/IBAN. Scegli il metodo direttamente nel carrello.' },
  { q: 'Quanto costa la spedizione?', a: 'La spedizione per Spagna e Italia è €10, calcolata al carrello. Se ordini più prodotti dalla stessa provenienza, viaggiano in un unico pacco.' },
  { q: 'Quando parte il mio ordine?', a: 'Le spedizioni partono dal Lunedì al Mercoledì, una volta ricevuto il pagamento. Riceverai il tracking appena spedito.' },
  { q: 'Il pacco è discreto?', a: 'Sì, packaging 100% anonimo e discreto, senza riferimenti al contenuto.' },
  { q: 'Posso ordinare quantità grandi?', a: 'Certo. Anzi, su ordini più grandi il costo della spedizione incide molto meno per grammo: conviene.' },
]

export default function FaqView() {
  const { setView } = useUIStore()
  return (
    <div style={{ paddingBottom: 110 }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'rgba(8,12,8,.96)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(61,255,110,.12)',
        padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button
          onClick={() => setView('hub')}
          aria-label="Torna alla home"
          style={{ flexShrink: 0, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >‹</button>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.05rem' }}>❓ Come funziona</span>
      </div>

      <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Intro */}
        <div>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem', marginBottom: 6 }}>
            Ordinare è semplice
          </div>
          <div style={{ fontSize: '.84rem', color: 'var(--muted)', lineHeight: 1.65 }}>
            Magic Trip House lavora <strong style={{ color: 'var(--text)' }}>online, su ordinazione e con pagamento anticipato</strong>. Ecco come funziona, passo per passo.
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {STEPS.map((s) => (
            <div key={s.title} style={{
              display: 'flex', gap: 14, background: 'var(--card)',
              border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px',
            }}>
              <div style={{ fontSize: '1.7rem', flexShrink: 0, lineHeight: 1.2 }}>{s.icon}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '.92rem', color: 'var(--green)', marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--muted)', lineHeight: 1.6 }}>{s.text}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Highlight box */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,200,66,.1), rgba(61,255,110,.06))',
          border: '1px solid rgba(245,200,66,.35)', borderRadius: 14, padding: '14px 16px',
          fontSize: '.82rem', color: 'rgba(245,200,66,.9)', lineHeight: 1.6,
        }}>
          ⚡ <strong>In breve:</strong> paghi → confermiamo → spediamo Lun–Mer → tracking in 24–72h. Niente magazzino, prezzi sempre competitivi, prodotto fresco.
        </div>

        {/* FAQ */}
        <div>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.2rem', marginBottom: 12 }}>
            Domande frequenti
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQS.map((f) => (
              <div key={f.q} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 15px' }}>
                <div style={{ fontWeight: 700, fontSize: '.85rem', color: 'var(--text)', marginBottom: 5 }}>{f.q}</div>
                <div style={{ fontSize: '.79rem', color: 'var(--muted)', lineHeight: 1.6 }}>{f.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => setView('catalog')}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, fontFamily: 'inherit',
            fontWeight: 800, fontSize: '.95rem', cursor: 'pointer',
            background: 'linear-gradient(135deg,rgba(61,255,110,.22),rgba(61,255,110,.1))',
            border: '1.5px solid rgba(61,255,110,.6)', color: 'var(--green)',
            boxShadow: '0 0 20px rgba(61,255,110,.18)',
          }}
        >🛍️ Esplora il catalogo →</button>
      </div>
    </div>
  )
}
