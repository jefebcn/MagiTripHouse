'use client'
import React from 'react'
import Image from 'next/image'
import Header from '@/components/layout/Header'
import PartnerReward from './PartnerReward'
import { useUIStore } from '@/store/uiStore'
import { useProducts } from '@/hooks/useProducts'
import { SHIP_META, type ShipOrigin } from '@/store/cartStore'

const SHIP_DESC: Partial<Record<ShipOrigin, string>> = {
  spain: 'Cali · Hash · Frozen · Premium',
  italy: 'Spedizione rapida dall’Italia',
}

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

      {/* ═══════════ 1) RITIRO DI PERSONA (separato dalle spedizioni) ═══════════ */}
      {countByOrigin('meetup') > 0 && (
        <>
          <SectionHead title="🤝 Ritiro di persona" sub="Prodotti solo a mano al meetup · nessuna spedizione" />
          <div style={{ padding: '0 16px' }}>
            <button
              onClick={() => goToCatalog({ ship: 'meetup' })}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                background: 'linear-gradient(135deg, rgba(192,132,252,.16) 0%, var(--card) 65%)',
                border: '1.5px solid rgba(192,132,252,.4)', borderRadius: 18, padding: '14px 14px', color: 'var(--text)',
              }}
            >
              <span style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', background: 'rgba(192,132,252,.15)' }}>🤝</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.02rem', color: '#d8b4fe' }}>Disponibili al meetup</div>
                <div style={{ fontSize: '.68rem', color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>Luogo e orario si concordano in chat dopo l’ordine</div>
              </div>
              <span style={{ flexShrink: 0, fontSize: '.72rem', fontWeight: 800, color: '#d8b4fe', background: 'rgba(192,132,252,.14)', border: '1px solid rgba(192,132,252,.35)', borderRadius: 999, padding: '5px 10px' }}>
                {countByOrigin('meetup')} prodott{countByOrigin('meetup') === 1 ? 'o' : 'i'} ›
              </span>
            </button>
          </div>
        </>
      )}

      {/* ═══════════ 2) SPEDIZIONE: Spagna / Italia ═══════════ */}
      <SectionHead title="📦 Spedizione a casa o in locker" sub="Scegli da dove parte il tuo pacco · tracking incluso" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px' }}>
        {(['spain', 'italy'] as ShipOrigin[]).map((o) => {
          const sm = SHIP_META[o]
          const n  = countByOrigin(o)
          return (
            <button
              key={o}
              onClick={() => goToCatalog({ ship: o })}
              style={{
                position: 'relative', overflow: 'hidden', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                background: `linear-gradient(160deg, ${sm.color}14 0%, var(--card) 55%)`,
                border: `1px solid ${sm.color}38`, borderRadius: 18, padding: '14px 13px 12px',
                display: 'flex', flexDirection: 'column', gap: 4, color: 'var(--text)',
              }}
            >
              <span style={{ fontSize: '1.9rem', lineHeight: 1 }}>{sm.flag}</span>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.12rem', color: sm.color, marginTop: 4 }}>{sm.label}</div>
              <div style={{ fontSize: '.64rem', color: 'var(--muted)', lineHeight: 1.35 }}>{SHIP_DESC[o]}</div>
              <div style={{ fontSize: '.66rem', color: 'rgba(237,250,238,.75)', marginTop: 4 }}>🚚 {sm.delivery}</div>
              <span style={{ alignSelf: 'flex-start', marginTop: 6, fontSize: '.68rem', fontWeight: 800, color: sm.color, background: `${sm.color}18`, border: `1px solid ${sm.color}40`, borderRadius: 999, padding: '4px 10px' }}>
                {isLoading ? '…' : `${n} prodott${n === 1 ? 'o' : 'i'}`} ›
              </span>
            </button>
          )
        })}
      </div>

      {/* ═══════════ NUOVI ARRIVI ═══════════ */}
      <NewArrivals />

      {/* ═══════════ PARTNER: Pharma → KratosLabs (si apre fuori dall'app) ═══════════ */}
      <SectionHead title="Partner" />
      <div style={{ padding: '0 16px' }}>
        <button
          onClick={() => {
            const url = 'https://www.kratoslabs.shop'
            const tg = (window as Window & { Telegram?: { WebApp?: { openLink?: (u: string) => void } } }).Telegram?.WebApp
            if (tg?.openLink) tg.openLink(url)
            else window.open(url, '_blank', 'noopener')
          }}
          style={{
            width: '100%', padding: 0, overflow: 'hidden', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            background: 'var(--card)', border: '1px solid rgba(129,140,248,.28)', borderRadius: 18, display: 'block',
          }}
        >
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1000 / 356' }}>
            <Image src="/partners/kratos-hero.jpg" alt="KratosLabs" fill sizes="(max-width: 480px) 100vw, 480px" style={{ objectFit: 'cover' }} />
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
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', color: '#a5b4fc' }}>Pharma EU</div>
              <div style={{ fontSize: '.63rem', color: 'var(--muted)', marginTop: 1 }}>Testati · dosaggi dichiarati · analisi su ogni lotto</div>
            </div>
            <span style={{ flexShrink: 0, fontSize: '.8rem', fontWeight: 700, color: '#a5b4fc' }}>↗</span>
          </div>
        </button>
        <PartnerReward />
      </div>

      {/* ═══════════ COMMUNITY: Telegram + Affiliati ═══════════ */}
      <SectionHead title="Community" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px' }}>
        <button
          onClick={() => {
            const url = 'https://t.me/+sOAYXTsv7qRmMTQ0'
            const tg = (window as Window & { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } } }).Telegram?.WebApp
            if (tg?.openTelegramLink) tg.openTelegramLink(url)
            else window.open(url, '_blank')
          }}
          style={{
            textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)',
            background: 'linear-gradient(160deg, rgba(34,158,217,.14) 0%, var(--card) 60%)',
            border: '1px solid rgba(34,158,217,.32)', borderRadius: 18, padding: '13px 13px 12px',
          }}
        >
          <div style={{ fontSize: '1.4rem' }}>📢</div>
          <div style={{ fontWeight: 800, fontSize: '.84rem', color: '#6cc6f0', marginTop: 6 }}>Canale Telegram</div>
          <div style={{ fontSize: '.64rem', color: 'var(--muted)', marginTop: 2, lineHeight: 1.35 }}>Novità, restock e promo in tempo reale</div>
        </button>
        <button
          onClick={() => setView('affiliates')}
          style={{
            textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)',
            background: 'linear-gradient(160deg, rgba(245,200,66,.12) 0%, var(--card) 60%)',
            border: '1px solid rgba(245,200,66,.3)', borderRadius: 18, padding: '13px 13px 12px',
          }}
        >
          <div style={{ fontSize: '1.4rem' }}>🎁</div>
          <div style={{ fontWeight: 800, fontSize: '.84rem', color: 'var(--gold)', marginTop: 6 }}>Invita un amico</div>
          <div style={{ fontSize: '.64rem', color: 'var(--muted)', marginTop: 2, lineHeight: 1.35 }}>Guadagni credito su ogni suo ordine</div>
        </button>
      </div>

    </div>
  )
}

// Titolo di sezione unico per tutta la home
function SectionHead({ title, sub, action, onAction }: { title: string; sub?: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 16px', margin: '28px 0 10px' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.08rem', color: 'var(--text)', letterSpacing: '.2px' }}>{title}</div>
        {sub && <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      {action && (
        <button onClick={onAction} style={{
          background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: '.74rem', fontWeight: 700, color: 'var(--green)', padding: 0,
        }}>{action} ›</button>
      )}
    </div>
  )
}

// ─── Nuovi arrivi: ultimi prodotti aggiunti, scroll orizzontale ───
const NEW_DAYS = 14

function NewArrivals() {
  const { products, isLoading } = useProducts()
  const { setDetailProduct, goToCatalog } = useUIStore()

  const items = React.useMemo(() => (
    [...products]
      .filter(p => p.category !== 'request' && p.stock !== 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
  ), [products])

  if (isLoading || items.length === 0) return null

  const now = Date.now()

  return (
    <div>
      <SectionHead title="Nuovi arrivi" action="Vedi tutti" onAction={() => goToCatalog({ ship: null })} />
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
  const [welcomeCap, setWelcomeCap] = React.useState<number | null>(null)
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
          }).then(r => r.json()).then(v => { if (v?.ok) { setWelcomePct(v.percent); setWelcomeCap(v.maxDiscount ?? null) } }).catch(() => {})
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
            <span style={{ fontSize: '.76rem', color: 'var(--gold)', fontWeight: 700 }}>🎟 −{welcomePct}% sul primo ordine{welcomeCap != null ? ` (max €${welcomeCap})` : ''}</span>
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
