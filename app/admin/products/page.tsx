'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { upload } from '@vercel/blob/client'

interface Variant { label: string; price: number }
interface BundleItem { productId: string; productName: string; emoji: string; qty: number }
interface Product {
  id: string; name: string; description?: string; category: string; tags: string[];
  variants: Variant[]; stock?: number | null; imageUrl?: string; mediaType?: string;
  emoji: string; badge?: string; origin?: string; sortOrder: number;
  isOnSale?: boolean; isComingSoon?: boolean; bundleItems?: BundleItem[] | null;
}

const EMPTY: Omit<Product, 'id' | 'sortOrder'> = {
  name: '', description: '', category: 'premium', tags: [],
  variants: [{ label: '', price: 0 }], stock: null,
  imageUrl: '', mediaType: 'image', emoji: '🌿', badge: '', origin: '',
  isOnSale: false, isComingSoon: false, bundleItems: null,
}

export default function AdminProducts() {
  return (
    <Suspense>
      <AdminProductsInner />
    </Suspense>
  )
}

function AdminProductsInner() {
  const searchParams = useSearchParams()
  const comboMode = searchParams.get('category') === 'combo'

  const [products, setProducts] = useState<Product[]>([])
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY, ...(comboMode ? { category: 'combo', badge: 'combo' } : {}) })
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const res = await fetch('/api/products')
    const data = await res.json()
    setProducts(data)
  }

  useEffect(() => { load() }, [])

  function startCreate() {
    setEditing(null)
    setForm({ ...EMPTY, ...(comboMode ? { category: 'combo', badge: 'combo' } : {}) })
  }

  function startEdit(p: Product) {
    setEditing(p)
    setForm({
      name: p.name, description: p.description ?? '',
      category: p.category, tags: p.tags,
      variants: p.variants.length ? p.variants : [{ label: '', price: 0 }],
      stock: p.stock ?? null, imageUrl: p.imageUrl ?? '',
      mediaType: p.mediaType ?? 'image', emoji: p.emoji,
      badge: p.badge ?? '', origin: p.origin ?? '',
      isOnSale: p.isOnSale ?? false, isComingSoon: p.isComingSoon ?? false,
      bundleItems: p.bundleItems ?? null,
    })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadProgress(0)
    const timer = setInterval(() => setUploadProgress(p => p < 90 ? p + 5 : p), 400)
    try {
      const ext = file.name.split('.').pop() ?? 'bin'
      const filename = `products/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const blob = await upload(filename, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      })
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image'
      setForm((f) => ({ ...f, imageUrl: blob.url, mediaType }))
      setUploadProgress(100)
    } catch (err) {
      console.error('Upload failed', err)
    }
    clearInterval(timer)
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    try {
      const body = {
        ...form,
        tags: typeof form.tags === 'string' ? (form.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean) : form.tags,
        stock: form.stock !== null && form.stock !== undefined ? Number(form.stock) : null,
        isOnSale: form.isOnSale ?? false,
        isComingSoon: form.isComingSoon ?? false,
      }
      const res = editing
        ? await fetch(`/api/products/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSaveError(data.error ?? `Errore ${res.status}`)
        setSaving(false)
        return
      }
      setEditing(null)
      setForm({ ...EMPTY })
      load()
    } catch {
      setSaveError('Errore di rete — riprova')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo prodotto?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    load()
  }

  async function moveProduct(id: string, dir: -1 | 1) {
    const sorted = [...products]
    const idx = sorted.findIndex((p) => p.id === id)
    const neighbor = sorted[idx + dir]
    if (!neighbor) return
    const myOrder = sorted[idx].sortOrder
    const neighborOrder = neighbor.sortOrder
    await Promise.all([
      fetch(`/api/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sortOrder: neighborOrder }) }),
      fetch(`/api/products/${neighbor.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sortOrder: myOrder }) }),
    ])
    load()
  }

  const inp = (label: string, key: keyof typeof EMPTY, type = 'text') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</label>
      <input
        type={type}
        value={String(form[key] ?? '')}
        onChange={(e) => setForm((f) => ({ ...f, [key]: type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value }))}
        style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: '.9rem', fontFamily: 'inherit', outline: 'none' }}
      />
    </div>
  )

  const displayedProducts = comboMode
    ? products.filter(p => p.category === 'combo')
    : products

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/admin" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '1.2rem' }}>‹</Link>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem' }}>
          {comboMode ? '🔥 Combo' : '📦 Prodotti'}
        </span>
        <button onClick={startCreate} style={{ marginLeft: 'auto', background: comboMode ? 'rgba(255,120,0,.12)' : 'rgba(61,255,110,.1)', border: `1px solid ${comboMode ? 'rgba(255,120,0,.4)' : 'rgba(61,255,110,.3)'}`, color: comboMode ? '#ff8c00' : 'var(--green)', borderRadius: 8, padding: '7px 14px', fontFamily: 'inherit', fontSize: '.82rem', fontWeight: 700, cursor: 'pointer' }}>
          + Nuova {comboMode ? 'Combo' : ''}
        </button>
      </div>

      {/* Form */}
      {(editing !== undefined && (editing !== null || form.name !== '' || true)) && (
        <div style={{ background: 'var(--bg2)', border: '1px solid rgba(61,255,110,.2)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem' }}>
            {editing ? '✏️ Modifica Prodotto' : '➕ Nuovo Prodotto'}
          </div>

          {/* Media upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
              Foto / Video
            </div>

            {form.imageUrl && (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                {form.mediaType === 'video'
                  ? <video src={form.imageUrl} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={form.imageUrl} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
                }
                <button
                  onClick={() => setForm((f) => ({ ...f, imageUrl: '', mediaType: 'image' }))}
                  style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.6)', border: 'none', borderRadius: 20, color: '#fff', fontSize: '.72rem', padding: '4px 9px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  ✕ Rimuovi
                </button>
              </div>
            )}

            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed rgba(61,255,110,.3)', borderRadius: 12, padding: 16,
                textAlign: 'center', cursor: 'pointer', color: 'var(--muted)', fontSize: '.85rem',
              }}
            >
              {uploading ? `⏳ Upload ${uploadProgress}%` : '📸 Carica nuovo file'}
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleUpload} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: '.75rem' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              oppure incolla URL
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <input
              type="url"
              placeholder="https://..."
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: '.85rem', fontFamily: 'inherit', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              {(['image', 'video'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, mediaType: t }))}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: '.8rem', fontWeight: 600,
                    background: form.mediaType === t ? 'rgba(61,255,110,.15)' : 'var(--bg3)',
                    color: form.mediaType === t ? 'var(--green)' : 'var(--muted)',
                    border: `1px solid ${form.mediaType === t ? 'rgba(61,255,110,.4)' : 'var(--border)'}`,
                  }}
                >
                  {t === 'image' ? '🖼 Immagine' : '🎦 Video'}
                </button>
              ))}
            </div>
          </div>

          {inp('Nome prodotto', 'name')}
          {inp('Descrizione', 'description')}
          {inp('Origine', 'origin')}
          {inp('Emoji', 'emoji')}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Categoria</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, badge: e.target.value }))}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: '.9rem', fontFamily: 'inherit', outline: 'none' }}
            >
              {['premium','frozen','new','hash','cbd','combo'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Tag (separati da virgola)</label>
            <input
              type="text"
              value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) }))}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: '.9rem', fontFamily: 'inherit', outline: 'none' }}
            />
          </div>

          {inp('Giacenza (vuoto = illimitata, 0 = esaurito)', 'stock', 'number')}

          {/* Stato prodotto */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Stato speciale</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isOnSale: !f.isOnSale, isComingSoon: false }))}
                style={{
                  flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: '.8rem', fontWeight: 700, border: '1px solid',
                  background: form.isOnSale ? 'rgba(232,59,59,.15)' : 'var(--bg3)',
                  color:      form.isOnSale ? '#e83b3b'             : 'var(--muted)',
                  borderColor: form.isOnSale ? 'rgba(232,59,59,.4)' : 'var(--border)',
                }}
              >🏷 In sconto</button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isComingSoon: !f.isComingSoon, isOnSale: false }))}
                style={{
                  flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: '.8rem', fontWeight: 700, border: '1px solid',
                  background: form.isComingSoon ? 'rgba(59,130,246,.15)' : 'var(--bg3)',
                  color:      form.isComingSoon ? '#7ec8f8'              : 'var(--muted)',
                  borderColor: form.isComingSoon ? 'rgba(59,130,246,.4)' : 'var(--border)',
                }}
              >🕐 In arrivo</button>
            </div>
          </div>

          {/* Bundle picker — solo per combo */}
          {form.category === 'combo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: '.75rem', color: '#ff8c00', textTransform: 'uppercase', letterSpacing: '.4px' }}>🔥 Prodotti inclusi nella combo</label>
              <div style={{ background: 'rgba(255,120,0,.06)', border: '1px solid rgba(255,120,0,.25)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {products.filter(p => p.category !== 'combo').map((p) => {
                  const item = (form.bundleItems ?? []).find(b => b.productId === p.id)
                  const selected = !!item
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => {
                          const cur = form.bundleItems ?? []
                          if (e.target.checked) {
                            setForm(f => ({ ...f, bundleItems: [...cur, { productId: p.id, productName: p.name, emoji: p.emoji, qty: 1 }] }))
                          } else {
                            setForm(f => ({ ...f, bundleItems: cur.filter(b => b.productId !== p.id) }))
                          }
                        }}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#ff8c00' }}
                      />
                      <span style={{ flex: 1, fontSize: '.85rem', color: selected ? 'var(--text)' : 'var(--muted)' }}>{p.emoji} {p.name}</span>
                      {selected && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, bundleItems: (f.bundleItems ?? []).map(b => b.productId === p.id ? { ...b, qty: Math.max(1, b.qty - 1) } : b) }))}
                            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,120,0,.4)', background: 'rgba(255,120,0,.1)', color: '#ff8c00', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >−</button>
                          <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 700, color: '#ff8c00', fontSize: '.9rem' }}>{item!.qty}</span>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, bundleItems: (f.bundleItems ?? []).map(b => b.productId === p.id ? { ...b, qty: b.qty + 1 } : b) }))}
                            style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,120,0,.4)', background: 'rgba(255,120,0,.1)', color: '#ff8c00', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >+</button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {products.filter(p => p.category !== 'combo').length === 0 && (
                  <div style={{ fontSize: '.8rem', color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>Nessun prodotto disponibile</div>
                )}
              </div>
            </div>
          )}

          {/* Variants */}
          <div>
            <div style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>Tagli & Prezzi</div>
            {form.variants.map((v, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  placeholder="es. 5g"
                  value={v.label}
                  onChange={(e) => {
                    const variants = [...form.variants]
                    variants[i] = { ...variants[i], label: e.target.value }
                    setForm((f) => ({ ...f, variants }))
                  }}
                  style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '.85rem', fontFamily: 'inherit', outline: 'none' }}
                />
                <input
                  type="number"
                  placeholder="€"
                  value={v.price || ''}
                  onChange={(e) => {
                    const variants = [...form.variants]
                    variants[i] = { ...variants[i], price: Number(e.target.value) }
                    setForm((f) => ({ ...f, variants }))
                  }}
                  style={{ width: 80, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: '.85rem', fontFamily: 'inherit', outline: 'none' }}
                />
                {form.variants.length > 1 && (
                  <button
                    onClick={() => setForm((f) => ({ ...f, variants: f.variants.filter((_, j) => j !== i) }))}
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--red)', cursor: 'pointer' }}
                  >✕</button>
                )}
              </div>
            ))}
            <button
              onClick={() => setForm((f) => ({ ...f, variants: [...f.variants, { label: '', price: 0 }] }))}
              style={{ width: '100%', background: 'var(--bg3)', border: '1.5px dashed rgba(61,255,110,.3)', borderRadius: 9, padding: 9, color: 'var(--green)', fontSize: '.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ＋ Aggiungi Taglio
            </button>
          </div>

          {saveError && (
            <div style={{ background: 'rgba(232,59,59,.1)', border: '1px solid rgba(232,59,59,.3)', borderRadius: 10, padding: '10px 14px', fontSize: '.82rem', color: 'var(--red)', marginBottom: 4 }}>
              ⚠️ {saveError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="checkout-btn"
              style={{ flex: 1 }}
            >
              {saving ? 'Salvataggio...' : '💾 Salva Prodotto'}
            </button>
            <button
              onClick={() => { setEditing(null); setForm({ ...EMPTY }) }}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '15px 16px', cursor: 'pointer', color: 'var(--muted)', fontFamily: 'inherit' }}
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* Product list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {displayedProducts.map((p, idx) => (
          <div key={p.id} style={{ background: 'var(--card)', border: `1px solid ${p.category === 'combo' ? 'rgba(255,120,0,.3)' : 'var(--border)'}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: 'var(--bg3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {p.imageUrl
                ? p.mediaType === 'video'
                  ? <span style={{ fontSize: '1.2rem' }}>▶</span>
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '1.2rem' }}>{p.emoji}</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 2 }}>
                {p.category === 'combo' && p.bundleItems?.length
                  ? p.bundleItems.map(b => `${b.qty}× ${b.productName}`).join(' + ')
                  : p.variants.map((v) => `${v.label} €${v.price}`).join(' · ')}
                {p.isComingSoon ? ' · 🕐 In arrivo' : p.isOnSale ? ' · 🏷 Sconto' : p.stock === 0 ? ' · ESAURITO' : p.stock != null ? ` · 📦 ${p.stock}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => moveProduct(p.id, -1)} disabled={idx === 0} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'var(--muted)', fontSize: '.85rem' }}>↑</button>
              <button onClick={() => moveProduct(p.id, 1)} disabled={idx === displayedProducts.length - 1} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'var(--muted)', fontSize: '.85rem' }}>↓</button>
              <button onClick={() => startEdit(p)} style={{ background: 'rgba(245,200,66,.1)', border: '1px solid rgba(245,200,66,.3)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'var(--gold)', fontSize: '.82rem' }}>✏️</button>
              <button onClick={() => handleDelete(p.id)} style={{ background: 'rgba(232,59,59,.1)', border: '1px solid rgba(232,59,59,.3)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: 'var(--red)', fontSize: '.82rem' }}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
