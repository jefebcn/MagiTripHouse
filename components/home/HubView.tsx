'use client'
import React from 'react'
import Image from 'next/image'
import Header from '@/components/layout/Header'
import { useUIStore } from '@/store/uiStore'
import { useProducts } from '@/hooks/useProducts'
import { SHIP_META, type ShipOrigin } from '@/store/cartStore'

const SHIP_DESC: Partial<Record<ShipOrigin, string>> = {
  spain: 'Cali · Hash · Frozen · Premium',
  italy: 'Spedizione rapida dall’Italia',
}

const CATEGORY_SHORTCUTS = [
  { id: 'premium', label: 'Premium', emoji: '💎' },
  { id: 'frozen',  label: 'Frozen',  emoji: '🧊' },
  { id: 'hash',    label: 'Hash',    emoji: '🪨' },
  { id: 'cbd',     label: 'THC',     emoji: '🌿' },
  { id: 'new',     label: 'Novità',  emoji: '✨' },
  { id: 'combo',   label: 'Combo',   emoji: '🔥' },
]

const INFO_TILES = [
  { icon: '📦', title: 'Discreto',    text: 'Packaging neutro, nessun riferimento' },
  { icon: '📍', title: 'Tracking',    text: 'ITA 24–48h · ESP 48–72h' },
  { icon: '💳', title: 'Pagamento',   text: 'Crypto o IBAN, in chat' },
]

// Spedizioni Lun–Mer: stato mostrato nella hero
function shippingStatus(d: Date): { open: boolean; label: string } {
  const day = d.getDay() // 0 dom … 6 sab
  if (day === 1 || day === 2) return { open: true, label: 'Spedizioni aperte fino a mercoledì' }
  if (day === 3) return { open: true, label: 'Oggi ultimo giorno di spedizioni' }
  return { open: false, label: 'Prossime spedizioni lunedì' }
}

const MEETUP_DEADLINE = new Date('2026-07-01T00:00:00')

export default function HubView() {
  const { goToCatalog, setView, userName, userAvatar } = useUIStore()
  const { products, isLoading } = useProducts()
  const firstName = (userName || '').trim().split(/\s+/)[0]

  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const shipStatus = shippingStatus(now)
  const hour = now.getHours()
  const greeting = hour < 6 ? 'Buonanotte' : hour < 13 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera'

  const msLeft = MEETUP_DEADLINE.getTime() - now.getTime()
  const meetupActive = msLeft > 0
  const daysLeft  = Math.max(0, Math.floor(msLeft / 86_400_000))
  const hoursLeft = Math.max(0, Math.floor((msLeft % 86_400_000) / 3_600_000))

  const countByOrigin = (o: ShipOrigin) =>
    products.filter(p => (p.shipFrom ?? 'spain') === o && p.category !== 'request').length

  return (
    <div style={{ paddingBottom: 110 }}>

      {/* ═══════════ TOP BAR ═══════════ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 16px 0' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '.72rem', color: 'var(--muted)', letterSpacing: '.3px' }}>{greeting}</div>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.35rem', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {firstName
              ? <><span style={{ color: 'var(--green)', textShadow: '0 0 14px rgba(61,255,110,.45)' }}>{firstName}</span> 👋</>
              : <>Benvenuto 👋</>}
          </div>
        </div>
        <button onClick={() => setView('faq')} aria-label="Come funziona" style={{
          width: 42, height: 42, borderRadius: 14, flexShrink: 0, cursor: 'pointer', fontSize: '1.05rem',
          background: 'rgba(245,200,66,.08)', border: '1px solid rgba(245,200,66,.3)', color: 'var(--gold)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>❓</button>
        <button onClick={() => setView('account')} aria-label="Account" style={{
          width: 42, height: 42, borderRadius: 14, flexShrink: 0, cursor: 'pointer', overflow: 'hidden', padding: 0,
          background: 'rgba(61,255,110,.08)', border: '1px solid rgba(61,255,110,.3)', color: 'var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fredoka One', cursive", fontSize: '1.05rem',
        }}>
          {userAvatar
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={userAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (firstName ? firstName[0].toUpperCase() : '👤')}
        </button>
      </div>

      {/* ═══════════ SEARCH ═══════════ */}
      <div style={{ padding: '14px 16px 0' }}>
        <button
          onClick={() => goToCatalog({ ship: null })}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '13px 16px',
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '1rem', opacity: .85 }}>🔍</span>
          <span style={{ flex: 1, color: 'var(--muted)', fontSize: '.88rem' }}>Cerca un prodotto…</span>
          <span style={{ fontSize: '.7rem', color: 'var(--green)', fontWeight: 700, background: 'rgba(61,255,110,.1)', borderRadius: 8, padding: '3px 8px' }}>
            {isLoading ? '…' : `${products.filter(p => p.category !== 'request').length} prodotti`}
          </span>
        </button>
      </div>

      {/* ═══════════ HERO CARD ═══════════ */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{
          position: 'relative', overflow: 'hidden', borderRadius: 22, padding: '18px 16px 16px',
          background: 'radial-gradient(120% 90% at 100% 0%, rgba(61,255,110,.22) 0%, rgba(61,255,110,.05) 45%, transparent 70%), linear-gradient(160deg, #122012 0%, var(--card) 70%)',
          border: '1px solid rgba(61,255,110,.28)', boxShadow: '0 10px 30px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04)',
        }}>
          {/* Griglia decorativa */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', opacity: .5,
            backgroundImage: 'linear-gradient(rgba(61,255,110,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(61,255,110,.05) 1px, transparent 1px)',
            backgroundSize: '22px 22px', maskImage: 'linear-gradient(180deg, #000, transparent 85%)', WebkitMaskImage: 'linear-gradient(180deg, #000, transparent 85%)',
          }} />

          <div style={{ position: 'relative', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Stato spedizioni (live) */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, padding: '4px 10px',
                fontSize: '.64rem', fontWeight: 800, letterSpacing: '.3px', whiteSpace: 'nowrap',
                background: shipStatus.open ? 'rgba(61,255,110,.12)' : 'rgba(245,200,66,.1)',
                border: `1px solid ${shipStatus.open ? 'rgba(61,255,110,.4)' : 'rgba(245,200,66,.35)'}`,
                color: shipStatus.open ? 'var(--green)' : 'var(--gold)',
              }}>
                <span className={shipStatus.open ? 'pulse-dot' : undefined} style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 8px currentColor' }} />
                {shipStatus.label}
              </span>

              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.45rem', lineHeight: 1.15, marginTop: 10 }}>
                Premium quality,<br /><span style={{ color: 'var(--green)', textShadow: '0 0 16px rgba(61,255,110,.4)' }}>consegna discreta.</span>
              </div>
              <div style={{ fontSize: '.72rem', color: 'rgba(237,250,238,.65)', marginTop: 6, lineHeight: 1.45 }}>
                A casa tua o in un locker, in Italia e in tutta Europa.
              </div>
            </div>

            {/* Logo: fluttua, tap = esplosione di particelle */}
            <div style={{ flexShrink: 0, marginTop: -4, marginRight: -4 }}>
              <Header size={104} />
            </div>
          </div>

          <div style={{ position: 'relative', display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={() => goToCatalog({ ship: null })} style={{
              flex: 1, padding: '12px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '.88rem',
              background: 'linear-gradient(135deg, var(--green), var(--green2))', border: 'none', color: '#041004',
              boxShadow: '0 0 20px rgba(61,255,110,.35)',
            }}>Sfoglia il catalogo ›</button>
            <button onClick={() => setView('faq')} style={{
              padding: '12px 14px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '.8rem',
              background: 'rgba(8,12,8,.5)', border: '1px solid var(--border)', color: 'var(--text)',
            }}>Come funziona</button>
          </div>
        </div>
      </div>

      {/* ═══════════ INFO TILES ═══════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '10px 16px 0' }}>
        {INFO_TILES.map(t => (
          <div key={t.title} style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 10px 9px',
          }}>
            <div style={{ fontSize: '1.15rem' }}>{t.icon}</div>
            <div style={{ fontWeight: 800, fontSize: '.72rem', marginTop: 4, color: 'var(--text)' }}>{t.title}</div>
            <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: 2, lineHeight: 1.35 }}>{t.text}</div>
          </div>
        ))}
      </div>

      {/* ═══════════ BENVENUTO (nuovo utente) / ORDINE IN CORSO ═══════════ */}
      <HomeOrderCard />

      {/* ═══════════ BANNER CANALE TELEGRAM ═══════════ */}
      <div style={{ padding: '12px 16px 0' }}>
        <button
          onClick={() => {
            const url = 'https://t.me/+sOAYXTsv7qRmMTQ0'
            const tg = (window as Window & { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } } }).Telegram?.WebApp
            if (tg?.openTelegramLink) tg.openTelegramLink(url)
            else window.open(url, '_blank')
          }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
            background: 'linear-gradient(135deg, rgba(34,158,217,.18), rgba(34,158,217,.07))',
            border: '1.5px solid rgba(34,158,217,.45)',
            borderRadius: 16, padding: '13px 16px',
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            boxShadow: '0 0 18px rgba(34,158,217,.12)',
          }}
        >
          <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>📢</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '.92rem', color: '#4db8e8' }}>Accedi al canale Telegram</div>
            <div style={{ fontSize: '.72rem', color: 'rgba(150,200,230,.8)', marginTop: 2 }}>Info, aggiornamenti e novità in tempo reale</div>
          </div>
          <span style={{
            flexShrink: 0, background: 'rgba(34,158,217,.2)', border: '1px solid rgba(34,158,217,.45)',
            borderRadius: 20, padding: '5px 13px', fontSize: '.76rem', fontWeight: 700, color: '#4db8e8',
          }}>Apri →</span>
        </button>
      </div>

      {/* ═══════════ SEZIONE CATALOGO ═══════════ */}
      <div style={{ padding: '22px 16px 0' }}>

        {/* Label sezione */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 3, height: 16, background: 'var(--green)', borderRadius: 2, boxShadow: 'var(--led-green)' }} />
          <span style={{ fontSize: '.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontWeight: 700 }}>
            Entra nel catalogo
          </span>
        </div>

        {/* Card "solo meetup" — sopra le card di spedizione per chiarire la distinzione */}
        {countByOrigin('meetup') > 0 && (
          <button
            onClick={() => goToCatalog({ ship: 'meetup' })}
            style={{
              width: '100%', marginBottom: 12, position: 'relative', overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(192,132,252,.12) 0%, var(--card) 60%)',
              border: '1px solid rgba(192,132,252,.3)',
              borderRadius: 14, padding: '11px 14px',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{
              position: 'absolute', right: -28, top: -28,
              width: 110, height: 110, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(192,132,252,.2) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🤝</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '.95rem', color: '#d8b4fe' }}>
                Disponibili solo per meetup
              </div>
              <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'rgba(216,180,254,.95)', marginTop: 3 }}>
                {countByOrigin('meetup')} prodott{countByOrigin('meetup') === 1 ? 'o' : 'i'} · ritiro a mano di persona
              </div>
            </div>
            <span style={{ fontSize: '.82rem', color: 'rgba(192,132,252,.6)', fontWeight: 700, flexShrink: 0 }}>›</span>
          </button>
        )}

        {/* Spain + Italy cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {(['spain', 'italy'] as ShipOrigin[]).map((o) => {
            const sm = SHIP_META[o]
            const n  = countByOrigin(o)
            return (
              <button
                key={o}
                onClick={() => goToCatalog({ ship: o })}
                style={{
                  position: 'relative', overflow: 'hidden',
                  background: `linear-gradient(150deg, ${sm.color}18 0%, var(--card) 60%)`,
                  border: `1.5px solid ${sm.color}44`,
                  borderRadius: 20, padding: '20px 14px 18px',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: 5,
                  boxShadow: `0 6px 24px rgba(0,0,0,.35), 0 0 28px ${sm.color}12`,
                  minHeight: 150,
                }}
              >
                {/* Cerchio decorativo sfondo */}
                <div style={{
                  position: 'absolute', right: -28, top: -28,
                  width: 110, height: 110, borderRadius: '50%',
                  background: `radial-gradient(circle, ${sm.color}22 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />

                <div style={{ fontSize: '2.8rem', lineHeight: 1 }}>{sm.flag}</div>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.25rem', color: sm.color, letterSpacing: '.3px' }}>
                  {sm.label}
                </div>
                <div style={{ fontSize: '.65rem', color: 'rgba(106,138,106,.75)', lineHeight: 1.4 }}>
                  {SHIP_DESC[o]}
                </div>
                <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: 2 }}>🚚 {sm.delivery}</div>
                <div style={{ fontSize: '.64rem', color: 'rgba(245,200,66,.8)', marginTop: 1 }}>📅 Spedizioni Lun–Mer</div>
                <div style={{ marginTop: 6 }}>
                  <span style={{
                    display: 'inline-block',
                    background: `${sm.color}18`, border: `1px solid ${sm.color}40`,
                    borderRadius: 20, padding: '3px 10px',
                    fontSize: '.66rem', color: sm.color, fontWeight: 700,
                  }}>
                    {isLoading ? '…' : `${n} prodott${n === 1 ? 'o' : 'i'}`} ›
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Pharma → sito partner KratosLabs (si apre fuori dall'app) */}
        <button
          onClick={() => {
            const url = 'https://www.kratoslabs.shop'
            const tg = (window as Window & { Telegram?: { WebApp?: { openLink?: (u: string) => void } } }).Telegram?.WebApp
            if (tg?.openLink) tg.openLink(url)
            else window.open(url, '_blank', 'noopener')
          }}
          style={{
            width: '100%', padding: 0, overflow: 'hidden', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            background: 'var(--card)', border: '1px solid rgba(129,140,248,.3)', borderRadius: 16,
            boxShadow: '0 4px 16px rgba(0,0,0,.25)', display: 'block',
          }}
        >
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1000 / 356' }}>
            <Image src="/partners/kratos-hero.jpg" alt="KratosLabs" fill sizes="(max-width: 480px) 100vw, 480px" style={{ objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 55%, rgba(8,12,8,.55) 100%)' }} />
            <span style={{
              position: 'absolute', top: 8, right: 8, fontSize: '.6rem', fontWeight: 700, letterSpacing: '.4px',
              background: 'rgba(8,12,8,.7)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 999, padding: '3px 8px', color: '#fff',
            }}>SITO PARTNER ↗</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px' }}>
            <div style={{ background: '#fff', borderRadius: 8, padding: '4px 6px', flexShrink: 0, display: 'flex' }}>
              <Image src="/partners/kratos-logo.png" alt="KratosLabs logo" width={84} height={27} style={{ objectFit: 'contain' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', color: '#818cf8' }}>Pharma EU</div>
              <div style={{ fontSize: '.63rem', color: 'var(--muted)', marginTop: 1 }}>Testati · dosaggi dichiarati · analisi su ogni lotto</div>
            </div>
            <span style={{
              flexShrink: 0, fontSize: '.7rem', fontWeight: 700, color: '#818cf8',
              border: '1px solid rgba(129,140,248,.45)', background: 'rgba(129,140,248,.1)', borderRadius: 20, padding: '5px 10px',
            }}>Apri ›</span>
          </div>
        </button>
      </div>

      {/* ═══════════ NUOVI ARRIVI (scroll orizzontale) ═══════════ */}
      <NewArrivals />

      {/* ═══════════ CATEGORIE (scroll orizzontale) ═══════════ */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', marginBottom: 12 }}>
          <div style={{ width: 3, height: 16, background: 'var(--gold)', borderRadius: 2, boxShadow: 'var(--led-gold)' }} />
          <span style={{ fontSize: '.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontWeight: 700 }}>
            Sfoglia categoria
          </span>
        </div>
        <div style={{ display: 'flex', gap: 9, overflowX: 'auto', padding: '0 16px 4px', scrollbarWidth: 'none' }}>
          {CATEGORY_SHORTCUTS.map(c => (
            <button
              key={c.id}
              onClick={() => goToCatalog({ ship: null, category: c.id })}
              style={{
                flexShrink: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '14px 12px', cursor: 'pointer',
                fontFamily: 'inherit', minWidth: 66,
                transition: 'border-color .15s, background .15s',
              }}
            >
              <span style={{ fontSize: '1.65rem' }}>{c.emoji}</span>
              <span style={{ fontSize: '.7rem', color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════ MEETUP — banda compatta ═══════════ */}
      <div style={{ margin: '20px 16px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', borderRadius: 14,
          background: meetupActive ? 'rgba(139,92,246,.07)' : 'rgba(60,60,80,.06)',
          border: meetupActive ? '1px solid rgba(139,92,246,.22)' : '1px solid rgba(100,100,130,.15)',
        }}>
          <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{meetupActive ? '🤝' : '😴'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '.82rem', fontWeight: 700, color: meetupActive ? '#c084fc' : 'var(--muted)' }}>
              Meetup{!meetupActive ? ' sospeso' : ''}
            </span>
            {meetupActive
              ? <span style={{ fontSize: '.69rem', color: 'var(--muted)', marginLeft: 8 }}>ritiro a mano · {daysLeft}g {hoursLeft}h rimasti</span>
              : <span style={{ fontSize: '.69rem', color: 'var(--muted)', marginLeft: 8 }}>solo spedizione per questo periodo</span>
            }
          </div>
          {meetupActive && (
            <span style={{
              background: 'rgba(139,92,246,.2)', border: '1px solid rgba(139,92,246,.32)',
              borderRadius: 20, padding: '3px 9px',
              fontSize: '.62rem', color: '#d8b4fe', fontWeight: 700, flexShrink: 0,
            }}>LIVE</span>
          )}
        </div>
      </div>

      {/* ═══════════ QUICK LINKS ═══════════ */}
      <div style={{ margin: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => setView('affiliates')}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(245,200,66,.06)', border: '1px solid rgba(245,200,66,.2)',
            borderRadius: 14, padding: '13px 16px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>🤝</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--text)' }}>Programma Affiliati</div>
            <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: 1 }}>Invita amici e guadagna credito</div>
          </div>
          <span style={{ fontSize: '.82rem', color: 'rgba(245,200,66,.5)', fontWeight: 700 }}>›</span>
        </button>
      </div>

    </div>
  )
}

// ─── Nuovi arrivi: ultimi prodotti aggiunti, scroll orizzontale ───
const NEW_DAYS = 14

function NewArrivals() {
  const { products, isLoading } = useProducts()
  const { setDetailProduct } = useUIStore()

  const items = React.useMemo(() => (
    [...products]
      .filter(p => p.category !== 'request' && p.stock !== 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
  ), [products])

  if (isLoading || items.length === 0) return null

  const now = Date.now()

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', marginBottom: 12 }}>
        <div style={{ width: 3, height: 16, background: 'var(--green)', borderRadius: 2, boxShadow: 'var(--led-green)' }} />
        <span style={{ fontSize: '.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.7px', fontWeight: 700 }}>
          Nuovi arrivi
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 4px', scrollbarWidth: 'none' }}>
        {items.map(p => {
          const minPrice = p.variants?.length ? Math.min(...p.variants.map(v => v.price)) : 0
          const isNew = now - new Date(p.createdAt).getTime() < NEW_DAYS * 86_400_000
          return (
            <button
              key={p.id}
              onClick={() => setDetailProduct(p)}
              style={{
                flexShrink: 0, width: 138, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
                padding: 0, overflow: 'hidden', color: 'var(--text)',
              }}
            >
              <div style={{ position: 'relative', width: '100%', height: 120, background: 'var(--bg3)' }}>
                {p.imageUrl ? (
                  p.mediaType === 'video' ? (
                    <video
                      src={`${p.imageUrl}#t=0.1`}
                      muted playsInline preload="metadata"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                        filter: p.isComingSoon ? 'brightness(0.6)' : 'none' }}
                    />
                  ) : (
                    <Image
                      src={p.imageUrl} alt={p.name} fill sizes="138px"
                      style={{ objectFit: 'cover', filter: p.isComingSoon ? 'brightness(0.6)' : 'none' }}
                    />
                  )
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.4rem' }}>
                    {p.emoji}
                  </div>
                )}
                {(p.isComingSoon || isNew) && (
                  <span style={{
                    position: 'absolute', top: 7, left: 7,
                    background: p.isComingSoon ? 'rgba(59,130,246,.9)' : 'rgba(61,255,110,.92)',
                    color: p.isComingSoon ? '#fff' : '#051a0b',
                    borderRadius: 20, padding: '2px 8px', fontSize: '.56rem', fontWeight: 800, letterSpacing: '.6px',
                  }}>{p.isComingSoon ? 'IN ARRIVO' : 'NUOVO'}</span>
                )}
              </div>
              <div style={{ padding: '8px 10px 10px' }}>
                <div style={{ fontSize: '.74rem', fontWeight: 700, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: '.7rem', color: 'var(--green)', fontWeight: 700, marginTop: 3 }}>
                  {minPrice > 0 ? `da €${minPrice}` : ''}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Card contestuale: benvenuto per chi non ha mai ordinato, oppure stato dell'ordine in corso ───
const WELCOME_CODE = 'BENVENUTO10'
const WELCOME_DISMISS_KEY = 'mth_welcome_dismissed'
type MiniOrder = { id: string; status: string; tracking: string | null; createdAt: string }
const ACTIVE_LABEL: Record<string, { text: string; icon: string; color: string }> = {
  pending: { text: 'In attesa di pagamento', icon: '⏳', color: '#f5c842' },
  paid:    { text: 'Pagato · in preparazione', icon: '✅', color: '#3dff6e' },
  shipped: { text: 'Spedito · in viaggio', icon: '📦', color: '#7ec8f8' },
}

function HomeOrderCard() {
  const { sessionToken, setView, goToCatalog } = useUIStore()
  const [orders, setOrders] = React.useState<MiniOrder[] | null>(null)
  const [welcomePct, setWelcomePct] = React.useState<number | null>(null)
  const [dismissed, setDismissed] = React.useState(true)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    try { setDismissed(localStorage.getItem(WELCOME_DISMISS_KEY) === '1') } catch { setDismissed(false) }
    if (!sessionToken) return
    const h = { Authorization: `Bearer ${sessionToken}` }
    fetch('/api/orders/mine', { headers: h })
      .then(r => r.ok ? r.json() : [])
      .then((d: MiniOrder[]) => {
        const list = Array.isArray(d) ? d : []
        setOrders(list)
        // Mostra il codice benvenuto solo se è davvero utilizzabile
        if (list.length === 0) {
          fetch('/api/discount/validate', {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...h },
            body: JSON.stringify({ code: WELCOME_CODE, origin: 'spain' }),
          }).then(r => r.json()).then(v => { if (v?.ok) setWelcomePct(v.percent) }).catch(() => {})
        }
      })
      .catch(() => {})
  }, [sessionToken])

  if (!orders) return null

  // Utente che ha già ordinato: mostra l'ordine più recente ancora in corso (pending solo se recente)
  if (orders.length > 0) {
    const recent = (o: MiniOrder) => Date.now() - new Date(o.createdAt).getTime() < 21 * 86_400_000
    const active = orders.find(o => (o.status === 'paid' || o.status === 'shipped') || (o.status === 'pending' && recent(o)))
    if (!active) return null
    const st = ACTIVE_LABEL[active.status]
    return (
      <div style={{ padding: '12px 16px 0' }}>
        <button onClick={() => setView('orders')} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          background: 'var(--card)', border: `1.5px solid ${st.color}55`, borderRadius: 16, padding: '12px 16px',
        }}>
          <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{st.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>Il tuo ordine {active.id}</div>
            <div style={{ fontWeight: 800, fontSize: '.88rem', color: st.color, marginTop: 1 }}>{st.text}</div>
            {active.tracking && <div style={{ fontSize: '.68rem', color: '#7ec8f8', marginTop: 2 }}>📍 Tracking disponibile</div>}
          </div>
          <span style={{ fontSize: '.76rem', fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>Dettagli ›</span>
        </button>
      </div>
    )
  }

  // Nuovo utente: come funziona + codice primo ordine
  if (dismissed) return null
  const dismiss = () => { setDismissed(true); try { localStorage.setItem(WELCOME_DISMISS_KEY, '1') } catch { /* */ } }
  const steps = [
    { icon: '🛍️', title: 'Scegli', text: 'Spagna o Italia, aggiungi al carrello' },
    { icon: '💳', title: 'Paga', text: 'Crypto o IBAN, in chat su Telegram' },
    { icon: '📦', title: 'Ricevi', text: 'A casa o in locker, con tracking' },
  ]
  return (
    <div style={{ padding: '12px 16px 0' }}>
      <div style={{
        position: 'relative', borderRadius: 16, padding: '14px 14px 12px',
        background: 'linear-gradient(135deg, rgba(61,255,110,.10), rgba(245,200,66,.06))',
        border: '1.5px solid rgba(61,255,110,.3)', boxShadow: '0 0 20px rgba(61,255,110,.08)',
      }}>
        <button onClick={dismiss} aria-label="Chiudi" style={{
          position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1rem', cursor: 'pointer', padding: 4,
        }}>✕</button>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.05rem', marginBottom: 10 }}>👋 Primo ordine? Ecco come funziona</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {steps.map((s, i) => (
            <div key={s.title} style={{ flex: 1, background: 'rgba(8,12,8,.45)', border: '1px solid var(--border)', borderRadius: 12, padding: '9px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem' }}>{s.icon}</div>
              <div style={{ fontWeight: 800, fontSize: '.74rem', marginTop: 3 }}>{i + 1}. {s.title}</div>
              <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: 2, lineHeight: 1.35 }}>{s.text}</div>
            </div>
          ))}
        </div>
        {welcomePct != null && (
          <button onClick={() => { navigator.clipboard?.writeText(WELCOME_CODE).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800) }} style={{
            marginTop: 10, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            background: 'rgba(245,200,66,.1)', border: '1.5px dashed rgba(245,200,66,.55)', borderRadius: 12,
            padding: '9px 12px', cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: '.76rem', color: 'var(--gold)', fontWeight: 700 }}>🎟 −{welcomePct}% sul primo ordine</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--gold)', letterSpacing: '.08em' }}>
              {copied ? '✓ copiato' : WELCOME_CODE}
            </span>
          </button>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button onClick={() => goToCatalog({ ship: null })} style={{
            flex: 1, padding: '10px', borderRadius: 12, fontFamily: 'inherit', fontWeight: 700, fontSize: '.82rem', cursor: 'pointer',
            background: 'rgba(61,255,110,.18)', border: '1px solid rgba(61,255,110,.5)', color: 'var(--green)',
          }}>Inizia a ordinare ›</button>
          <button onClick={() => setView('faq')} style={{
            padding: '10px 14px', borderRadius: 12, fontFamily: 'inherit', fontWeight: 700, fontSize: '.78rem', cursor: 'pointer',
            background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--muted)',
          }}>❓ FAQ</button>
        </div>
      </div>
    </div>
  )
}
