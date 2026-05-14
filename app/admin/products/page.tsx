'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

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
    setUploadProgress(5)
    setSaveError('')
    try {
      // Step 1: get presigned URL from server
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Errore server ${res.status}`)
      }
      const { signedUrl, publicUrl } = await res.json()
      setUploadProgress(15)

      // Step 2: PUT file directly to R2 via XHR (more reliable than fetch on iOS Safari)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.timeout = 180_000
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setUploadProgress(15 + Math.round((ev.loaded / ev.total) * 83))
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`R2 ha rifiutato il file: ${xhr.status} ${xhr.statusText}`))
        }
        xhr.onerror = () => reject(new Error('Errore di rete durante il caricamento'))
        xhr.ontimeout = () => reject(new Error('Timeout: connessione troppo lenta'))
        xhr.send(file)
      })

      const mediaType = file.type.startsWith('video/') ? 'video' : 'image'
      setForm((f) => ({ ...f, imageUrl: publicUrl, mediaType }))
      setUploadProgress(100)
    } catch (err: any) {
      setSaveError(`⚠ Upload fallito: ${err.message}`)
      console.error('Upload failed', err)
    }
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
      await load()
      setEditing(null)
      setForm({ ...EMPTY, ...(comboMode ? { category: 'combo', badge: 'combo' } : {}) })
    } catch (err: any) {
      setSaveError(err.message)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo prodotto?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    await load()
    if (editing?.id === id) {
      setEditing(null)
      setForm({ ...EMPTY })
    }
  }

  async function handleMove(id: string, dir: 'up' | 'down') {
    const idx = products.findIndex(p => p.id === id)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === products.length - 1) return
    const other = products[dir === 'up' ? idx - 1 : idx + 1]
    await Promise.all([
      fetch(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...products[idx], sortOrder: other.sortOrder }) }),
      fetch(`/api/products/${other.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...other, sortOrder: products[idx].sortOrder }) }),
    ])
    await load()
  }

  const inp: React.CSSProperties = {
    width: '100%', background: '#0d1a0d', border: '1px solid #1e3a1e',
    borderRadius: 8, padding: '9px 12px', color: '#edfaee', fontSize: '.9rem',
    boxSizing: 'border-box',
  }
  const label: React.CSSProperties = {
    fontSize: '.72rem', color: '#6a8a6a', letterSpacing: '.5px',
    textTransform: 'uppercase', marginBottom: 4, display: 'block',
  }

  const displayedProducts = comboMode
    ? products.filter(p => p.category === 'combo')
    : products

  return (
    <div style={{ minHeight: '100vh', background: '#080c08', color: '#edfaee', fontFamily: "'DM Sans', sans-serif", padding: '16px 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/admin" style={{ color: '#6a8a6a', fontSize: '1.2rem', textDecoration: 'none' }}>‹</Link>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontFamily: "'Fredoka One', cursive" }}>
            {comboMode ? '🔥 Combo' : '📦 Prodotti'}
          </h1>
        </div>
        <button onClick={startCreate} style={{
          background: comboMode ? 'linear-gradient(135deg,#ff6b00,#ff9500)' : 'linear-gradient(135deg,#3dff6e,#2fb344)',
          border: 'none', borderRadius: 8, padding: '8px 16px',
          color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '.85rem',
        }}>+ Nuova</button>
      </div>

      {/* Form */}
      <div style={{ background: '#111611', border: '1px solid #1e2a1e', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: '.95rem' }}>
          {editing ? '✏️ Modifica Prodotto' : '+ Nuovo Prodotto'}
        </div>

        {/* Upload */}
        <div style={{ marginBottom: 14 }}>
          <span style={label}>FOTO / VIDEO</span>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: '2px dashed #1e3a1e', borderRadius: 10, padding: '18px 12px',
              textAlign: 'center', cursor: 'pointer', marginBottom: 8,
              background: uploading ? 'rgba(61,255,110,.04)' : 'transparent',
            }}
          >
            {uploading
              ? `🔄 Caricamento... ${uploadProgress}%`
              : form.imageUrl
                ? `✅ File caricato`
                : '📸 Carica nuovo file'
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleUpload} />
          <div style={{ textAlign: 'center', color: '#6a8a6a', fontSize: '.75rem', marginBottom: 6 }}>oppure incolla URL</div>
          <input style={inp} placeholder="https://..." value={form.imageUrl ?? ''} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {(['image', 'video'] as const).map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, mediaType: t }))} style={{
                flex: 1, padding: '7px 0', borderRadius: 8, cursor: 'pointer', fontSize: '.8rem', fontWeight: 600,
                border: form.mediaType === t ? 'none' : '1px solid #1e3a1e',
                background: form.mediaType === t ? 'linear-gradient(135deg,#3dff6e,#2fb344)' : '#0d1a0d',
                color: form.mediaType === t ? '#000' : '#6a8a6a',
              }}>{t === 'image' ? '🖼️ Immagine' : '🎥 Video'}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <span style={label}>NOME PRODOTTO</span>
          <input style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <span style={label}>DESCRIZIONE</span>
          <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <span style={label}>ORIGINE</span>
          <input style={inp} value={form.origin ?? ''} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <span style={label}>EMOJI</span>
          <input style={inp} value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <span style={label}>CATEGORIA</span>
          <select style={{ ...inp }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {['premium', 'frozen', 'new', 'hash', 'cbd', 'combo'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <span style={label}>BADGE</span>
          <select style={{ ...inp }} value={form.badge ?? ''} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}>
            <option value="">nessuno</option>
            {['premium', 'frozen', 'new', 'hash', 'cbd', 'combo'].map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <span style={label}>TAG (virgola)</span>
          <input style={inp} value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <span style={label}>STOCK (vuoto = illimitato)</span>
          <input type="number" style={inp} value={form.stock ?? ''} onChange={e => setForm(f => ({ ...f, stock: e.target.value === '' ? null : Number(e.target.value) }))} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.85rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isOnSale ?? false} onChange={e => setForm(f => ({ ...f, isOnSale: e.target.checked }))} />
            In sconto
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.85rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.isComingSoon ?? false} onChange={e => setForm(f => ({ ...f, isComingSoon: e.target.checked }))} />
            Prossimamente
          </label>
        </div>

        {/* Variants */}
        <div style={{ marginBottom: 10 }}>
          <span style={label}>TAGLI / VARIANTI</span>
          {form.variants.map((v, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input style={{ ...inp, flex: 2 }} placeholder="es. 1g" value={v.label} onChange={e => setForm(f => ({ ...f, variants: f.variants.map((vv, ii) => ii === i ? { ...vv, label: e.target.value } : vv) }))} />
              <input type="number" style={{ ...inp, flex: 1 }} placeholder="€" value={v.price || ''} onChange={e => setForm(f => ({ ...f, variants: f.variants.map((vv, ii) => ii === i ? { ...vv, price: Number(e.target.value) } : vv) }))} />
              <button onClick={() => setForm(f => ({ ...f, variants: f.variants.filter((_, ii) => ii !== i) }))} style={{ background: 'transparent', border: 'none', color: '#e83b3b', cursor: 'pointer', fontSize: '1rem' }}>×</button>
            </div>
          ))}
          <button onClick={() => setForm(f => ({ ...f, variants: [...f.variants, { label: '', price: 0 }] }))} style={{ fontSize: '.78rem', color: '#3dff6e', background: 'transparent', border: 'none', cursor: 'pointer' }}>+ Aggiungi taglio</button>
        </div>

        {/* Bundle picker — only for combo products */}
        {form.category === 'combo' && (
          <div style={{ marginBottom: 14 }}>
            <span style={label}>PRODOTTI NEL COMBO</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {products.filter(p => p.category !== 'combo').map(p => {
                const item = form.bundleItems?.find(b => b.productId === p.id)
                const checked = !!item
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0d1a0d', borderRadius: 8, padding: '8px 10px', border: checked ? '1px solid rgba(61,255,110,.3)' : '1px solid #1e3a1e' }}>
                    <input type="checkbox" checked={checked} onChange={e => {
                      if (e.target.checked) {
                        setForm(f => ({ ...f, bundleItems: [...(f.bundleItems ?? []), { productId: p.id, productName: p.name, emoji: p.emoji, qty: 1 }] }))
                      } else {
                        setForm(f => ({ ...f, bundleItems: (f.bundleItems ?? []).filter(b => b.productId !== p.id) }))
                      }
                    }} />
                    <span style={{ flex: 1, fontSize: '.85rem' }}>{p.emoji} {p.name}</span>
                    {checked && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => setForm(f => ({ ...f, bundleItems: (f.bundleItems ?? []).map(b => b.productId === p.id ? { ...b, qty: Math.max(1, b.qty - 1) } : b) }))} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #1e3a1e', background: '#111611', color: '#edfaee', cursor: 'pointer', fontSize: '.9rem' }}>-</button>
                        <span style={{ minWidth: 20, textAlign: 'center', fontSize: '.85rem' }}>{item!.qty}</span>
                        <button onClick={() => setForm(f => ({ ...f, bundleItems: (f.bundleItems ?? []).map(b => b.productId === p.id ? { ...b, qty: b.qty + 1 } : b) }))} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #1e3a1e', background: '#111611', color: '#edfaee', cursor: 'pointer', fontSize: '.9rem' }}>+</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {saveError && (
          <div style={{ background: 'rgba(232,59,59,.12)', border: '1px solid rgba(232,59,59,.4)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: '.82rem', color: '#ff8080' }}>
            {saveError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 1, background: saving ? '#1e3a1e' : comboMode ? 'linear-gradient(135deg,#ff6b00,#ff9500)' : 'linear-gradient(135deg,#3dff6e,#2fb344)',
            border: 'none', borderRadius: 8, padding: '10px 0',
            color: '#000', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
          }}>{saving ? 'Salvataggio...' : editing ? 'Salva modifiche' : 'Crea prodotto'}</button>
          {editing && (
            <button onClick={() => { setEditing(null); setForm({ ...EMPTY }) }} style={{
              padding: '10px 16px', borderRadius: 8, border: '1px solid #1e3a1e',
              background: 'transparent', color: '#6a8a6a', cursor: 'pointer',
            }}>Annulla</button>
          )}
        </div>
      </div>

      {/* Product list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {displayedProducts.map((p, idx) => (
          <div key={p.id} style={{ background: '#111611', border: '1px solid #1e2a1e', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>{p.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
              <div style={{ fontSize: '.72rem', color: '#6a8a6a' }}>{p.category}{p.stock === 0 ? ' — ESAURITO' : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button onClick={() => handleMove(p.id, 'up')} disabled={idx === 0} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #1e3a1e', background: 'transparent', color: '#6a8a6a', cursor: 'pointer', fontSize: '.75rem' }}>↑</button>
              <button onClick={() => handleMove(p.id, 'down')} disabled={idx === displayedProducts.length - 1} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #1e3a1e', background: 'transparent', color: '#6a8a6a', cursor: 'pointer', fontSize: '.75rem' }}>↓</button>
              <button onClick={() => startEdit(p)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #1e3a1e', background: 'transparent', color: '#3dff6e', cursor: 'pointer', fontSize: '.75rem' }}>✏️</button>
              <button onClick={() => handleDelete(p.id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'rgba(232,59,59,.15)', color: '#e83b3b', cursor: 'pointer', fontSize: '.75rem' }}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
