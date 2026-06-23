'use client'
import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Variant { label: string; price: number }
interface BundleItem { productId: string; productName: string; emoji: string; qty: number }
interface Product {
  id: string; name: string; description?: string; category: string; tags: string[];
  variants: Variant[]; stock?: number | null; imageUrl?: string; mediaType?: string;
  emoji: string; badge?: string; origin?: string; sortOrder: number;
  isOnSale?: boolean; isComingSoon?: boolean; hidden?: boolean; shipFrom?: string; bundleItems?: BundleItem[] | null;
}

const EMPTY: Omit<Product, 'id' | 'sortOrder'> = {
  name: '', description: '', category: 'premium', tags: [],
  variants: [{ label: '', price: 0 }], stock: null,
  imageUrl: '', mediaType: 'image', emoji: '🌿', badge: '', origin: '',
  isOnSale: false, isComingSoon: false, hidden: false, shipFrom: 'spain', bundleItems: null,
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
  const listRef = useRef<HTMLDivElement>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const dragIdxRef = useRef<number | null>(null)
  const hoverIdxRef = useRef<number | null>(null)

  // Bulk price edit
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  // shared prices: label → price (applies to ALL selected products that have that label)
  const [bulkSharedPrices, setBulkSharedPrices] = useState<Record<string, number>>({})
  const [bulkSaving, setBulkSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/products?all=true')
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
      hidden: p.hidden ?? false, shipFrom: p.shipFrom ?? 'spain', bundleItems: p.bundleItems ?? null,
    })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadProgress(5)
    setSaveError('')

    const workerUrl = process.env.NEXT_PUBLIC_UPLOAD_WORKER_URL

    try {
      if (workerUrl) {
        // Percorso principale: Cloudflare Worker → R2 diretto
        // Nessun limite di dimensione, nessun CORS, progresso reale
        const { publicUrl } = await new Promise<{ publicUrl: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('POST', workerUrl)
          xhr.setRequestHeader('X-Filename', file.name)
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
          xhr.timeout = 600_000
          xhr.upload.onprogress = ev => {
            if (ev.lengthComputable)
              setUploadProgress(5 + Math.round((ev.loaded / ev.total) * 90))
          }
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try { resolve(JSON.parse(xhr.responseText)) }
              catch { reject(new Error('Risposta Worker non valida')) }
            } else {
              reject(new Error(`Worker errore ${xhr.status}: ${xhr.statusText}`))
            }
          }
          xhr.onerror   = () => reject(new Error('Errore di rete verso il Worker'))
          xhr.ontimeout = () => reject(new Error('Timeout: connessione troppo lenta'))
          xhr.send(file)
        })

        const mediaType = file.type.startsWith('video/') ? 'video' : 'image'
        setForm(f => ({ ...f, imageUrl: publicUrl, mediaType }))
        setUploadProgress(100)

      } else {
        // Fallback: server Vercel (max 4MB — solo immagini o video compressi)
        if (file.size > 4 * 1024 * 1024) {
          throw new Error(
            `File ${(file.size / 1024 / 1024).toFixed(1)}MB troppo grande. ` +
            'Configura NEXT_PUBLIC_UPLOAD_WORKER_URL su Vercel per caricare video grandi.'
          )
        }
        setUploadProgress(30)
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error ?? `Errore server ${res.status}`)
        }
        const { publicUrl } = await res.json()
        const mediaType = file.type.startsWith('video/') ? 'video' : 'image'
        setForm(f => ({ ...f, imageUrl: publicUrl, mediaType }))
        setUploadProgress(100)
      }

    } catch (err: any) {
      setSaveError(`⚠ Upload fallito: ${err.message}`)
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
        hidden: form.hidden ?? false,
        shipFrom: form.shipFrom ?? 'spain',
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

  function toggleBulkMode() {
    setBulkMode(m => !m)
    setSelectedIds(new Set())
    setBulkOpen(false)
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openBulkPanel() {
    // Collect all unique labels across selected products (preserving order of first occurrence)
    const seen = new Set<string>()
    const initPrices: Record<string, number> = {}
    Array.from(selectedIds).forEach(id => {
      const p = products.find(x => x.id === id)
      if (!p) return
      p.variants.forEach(v => {
        if (!seen.has(v.label)) {
          seen.add(v.label)
          initPrices[v.label] = v.price
        }
      })
    })
    setBulkSharedPrices(initPrices)
    setBulkOpen(true)
  }

  async function saveBulkPrices() {
    setBulkSaving(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => {
          const p = products.find(x => x.id === id)
          if (!p) return Promise.resolve()
          const variants = p.variants.map(v =>
            bulkSharedPrices[v.label] !== undefined
              ? { ...v, price: bulkSharedPrices[v.label] }
              : v
          )
          return fetch(`/api/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variants }),
          })
        })
      )
      setBulkOpen(false)
      setBulkMode(false)
      setSelectedIds(new Set())
      load()
    } finally {
      setBulkSaving(false)
    }
  }

  async function setBulkShipFrom(shipFrom: 'spain' | 'italy' | 'pharma') {
    setBulkSaving(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shipFrom }),
          })
        )
      )
      setBulkMode(false)
      setSelectedIds(new Set())
      load()
    } finally {
      setBulkSaving(false)
    }
  }

  const onDragTouchStart = useCallback((e: React.TouchEvent, idx: number) => {
    e.preventDefault()
    dragIdxRef.current = idx
    hoverIdxRef.current = idx
    setDragIdx(idx)
    setHoverIdx(idx)
  }, [])

  const onDragTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragIdxRef.current === null) return
    e.preventDefault()
    const touch = e.touches[0]
    const list = listRef.current
    if (!list) return
    const children = Array.from(list.children) as HTMLElement[]
    for (let i = 0; i < children.length; i++) {
      const rect = children[i].getBoundingClientRect()
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        hoverIdxRef.current = i
        setHoverIdx(i)
        break
      }
    }
  }, [])

  const onDragTouchEnd = useCallback(async () => {
    const from = dragIdxRef.current
    const to = hoverIdxRef.current
    setDragIdx(null)
    setHoverIdx(null)
    dragIdxRef.current = null
    hoverIdxRef.current = null
    if (from === null || to === null || from === to) return
    setProducts(prev => {
      const list = [...prev]
      const [moved] = list.splice(from, 1)
      list.splice(to, 0, moved)
      const updates = list.map((p, i) => ({ id: p.id, sortOrder: i }))
      Promise.all(updates.map(u =>
        fetch(`/api/products/${u.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: u.sortOrder }),
        })
      )).catch(() => {})
      return list.map((p, i) => ({ ...p, sortOrder: i }))
    })
  }, [])

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Link href="/admin" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '1.2rem' }}>‹</Link>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem' }}>
          {comboMode ? '🔥 Combo' : '📦 Prodotti'}
        </span>
        {!comboMode && !bulkMode && (
          <Link href="/admin/bulk-images" style={{ marginLeft: 'auto', background: 'rgba(61,255,110,.08)', border: '1px solid rgba(61,255,110,.25)', color: 'var(--green)', borderRadius: 8, padding: '7px 11px', fontSize: '.78rem', fontWeight: 700, textDecoration: 'none' }}>
            🖼️ Bulk
          </Link>
        )}
        <button
          onClick={toggleBulkMode}
          style={{
            marginLeft: comboMode ? 'auto' : undefined,
            background: bulkMode ? 'rgba(245,200,66,.18)' : 'var(--bg3)',
            border: `1px solid ${bulkMode ? 'rgba(245,200,66,.5)' : 'var(--border)'}`,
            color: bulkMode ? 'var(--gold)' : 'var(--muted)',
            borderRadius: 8, padding: '7px 12px',
            fontFamily: 'inherit', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          {bulkMode ? '✕ Annulla' : '☑️ Multi'}
        </button>
        {!bulkMode && (
          <>
            {!comboMode && (
              <button
                onClick={async () => {
                  if (!confirm('Importare 105 prodotti Pharma EU? I duplicati verranno saltati.')) return
                  const res = await fetch('/api/admin/import-pharma', { method: 'POST' })
                  const d = await res.json()
                  alert(`✅ Importati: ${d.created} · Saltati: ${d.skipped}`)
                  load()
                }}
                style={{ background: 'rgba(129,140,248,.12)', border: '1px solid rgba(129,140,248,.4)', color: '#818cf8', borderRadius: 8, padding: '7px 12px', fontFamily: 'inherit', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer' }}
              >💊 Import</button>
            )}
            <button onClick={startCreate} style={{ background: comboMode ? 'rgba(255,120,0,.12)' : 'rgba(61,255,110,.1)', border: `1px solid ${comboMode ? 'rgba(255,120,0,.4)' : 'rgba(61,255,110,.3)'}`, color: comboMode ? '#ff8c00' : 'var(--green)', borderRadius: 8, padding: '7px 14px', fontFamily: 'inherit', fontSize: '.82rem', fontWeight: 700, cursor: 'pointer' }}>
              + Nuova {comboMode ? 'Combo' : ''}
            </button>
          </>
        )}
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

          {/* Ship origin */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Spedizione da</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { id: 'spain',  label: '🇪🇸 Spagna',    color: '#f5c842' },
                { id: 'italy',  label: '🇮🇹 Italia',    color: '#3dff6e' },
                { id: 'pharma', label: '💊 Pharma EU',  color: '#818cf8' },
              ] as const).map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, shipFrom: s.id }))}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: '.85rem', fontWeight: 700, border: '1px solid',
                    background: form.shipFrom === s.id ? `${s.color}22` : 'var(--bg3)',
                    color: form.shipFrom === s.id ? s.color : 'var(--muted)',
                    borderColor: form.shipFrom === s.id ? `${s.color}88` : 'var(--border)',
                  }}
                >{s.label}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Categoria</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, badge: e.target.value }))}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: '.9rem', fontFamily: 'inherit', outline: 'none' }}
            >
              {['premium','frozen','new','hash','cbd','combo','request','injectable','oral','sarms','peptides','pct'].map((c) => (
                <option key={c} value={c}>{
                  c === 'request' ? 'request (Su Richiesta)' :
                  c === 'injectable' ? '💉 injectable' :
                  c === 'oral' ? '💊 oral' :
                  c === 'sarms' ? '🧬 sarms' :
                  c === 'peptides' ? '🧪 peptides' :
                  c === 'pct' ? '🔄 pct' : c
                }</option>
              ))}
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
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, hidden: !f.hidden }))}
                style={{
                  flex: 1, padding: '9px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: '.8rem', fontWeight: 700, border: '1px solid',
                  background: form.hidden ? 'rgba(106,138,106,.15)' : 'var(--bg3)',
                  color:      form.hidden ? 'var(--muted)'          : 'var(--muted)',
                  borderColor: form.hidden ? 'rgba(106,138,106,.4)' : 'var(--border)',
                }}
              >{form.hidden ? '🙈 Nascosto' : '👁 Visibile'}</button>
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

      {/* Drag hint */}
      {displayedProducts.length > 1 && (
        <div style={{ fontSize: '.72rem', color: 'var(--muted)', textAlign: 'center', marginBottom: 8, opacity: .7 }}>
          ☰ Tieni premuto e trascina per riordinare
        </div>
      )}

      {/* Product list */}
      <div
        ref={listRef}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        onTouchMove={onDragTouchMove}
        onTouchEnd={onDragTouchEnd}
        onTouchCancel={onDragTouchEnd}
      >
        {displayedProducts.map((p, idx) => {
          const isDragging = dragIdx === idx
          const isHover = hoverIdx === idx && dragIdx !== null && dragIdx !== idx
          const isSelected = selectedIds.has(p.id)
          return (
            <div
              key={p.id}
              onClick={bulkMode ? () => toggleSelect(p.id) : undefined}
              style={{
                background: isSelected ? 'rgba(245,200,66,.07)' : 'var(--card)',
                border: isSelected
                  ? '2px solid rgba(245,200,66,.6)'
                  : isHover
                    ? '2px solid var(--green)'
                    : `1px solid ${p.category === 'combo' ? 'rgba(255,120,0,.3)' : 'var(--border)'}`,
                borderRadius: 12, padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: 10,
                opacity: isDragging ? 0.4 : 1,
                transform: isDragging ? 'scale(.97)' : 'scale(1)',
                transition: 'opacity .15s, transform .15s, border-color .1s, background .1s',
                userSelect: 'none',
                cursor: bulkMode ? 'pointer' : 'default',
              }}
            >
              {/* Drag handle OR checkbox */}
              {bulkMode ? (
                <div style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 6, border: `2px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`, background: isSelected ? 'rgba(245,200,66,.2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontSize: '.9rem' }}>
                  {isSelected && '✓'}
                </div>
              ) : (
                <div
                  onTouchStart={(e) => onDragTouchStart(e, idx)}
                  style={{ flexShrink: 0, cursor: 'grab', touchAction: 'none', display: 'flex', flexDirection: 'column', gap: 3, padding: '6px 4px', alignItems: 'center' }}
                >
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 16, height: 2, borderRadius: 1, background: 'var(--muted)', opacity: .6 }} />
                  ))}
                </div>
              )}

              <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: 'var(--bg3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.imageUrl
                  ? p.mediaType === 'video'
                    ? <span style={{ fontSize: '1.1rem' }}>▶</span>
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '1.1rem' }}>{p.emoji}</span>
                }
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ marginRight: 4 }}>{(p.shipFrom ?? 'spain') === 'italy' ? '🇮🇹' : (p.shipFrom ?? 'spain') === 'pharma' ? '💊' : '🇪🇸'}</span>{p.name}
                </div>
                <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 2 }}>
                  {p.category === 'combo' && p.bundleItems?.length
                    ? p.bundleItems.map(b => `${b.qty}× ${b.productName}`).join(' + ')
                    : p.variants.map((v) => `${v.label} €${v.price}`).join(' · ')}
                  {p.hidden ? ' · 🙈 NASCOSTO' : p.isComingSoon ? ' · 🕐 In arrivo' : p.isOnSale ? ' · 🏷 Sconto' : p.stock === 0 ? ' · ESAURITO' : p.stock != null ? ` · 📦 ${p.stock}` : ''}
                </div>
              </div>

              {!bulkMode && (
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <button
                    title={p.hidden ? 'Nasconsto — clicca per pubblicare' : 'Visibile — clicca per nascondere'}
                    onClick={async (e) => {
                      e.stopPropagation()
                      await fetch(`/api/products/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hidden: !p.hidden }) })
                      load()
                    }}
                    style={{ background: p.hidden ? 'rgba(106,138,106,.12)' : 'rgba(61,255,110,.1)', border: `1px solid ${p.hidden ? 'rgba(106,138,106,.3)' : 'rgba(61,255,110,.35)'}`, borderRadius: 6, width: 30, height: 30, cursor: 'pointer', color: p.hidden ? 'var(--muted)' : 'var(--green)', fontSize: '.82rem' }}>
                    {p.hidden ? '🙈' : '👁'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); startEdit(p) }} style={{ background: 'rgba(245,200,66,.1)', border: '1px solid rgba(245,200,66,.3)', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', color: 'var(--gold)', fontSize: '.82rem' }}>✏️</button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }} style={{ background: 'rgba(232,59,59,.1)', border: '1px solid rgba(232,59,59,.3)', borderRadius: 6, width: 30, height: 30, cursor: 'pointer', color: 'var(--red)', fontSize: '.82rem' }}>🗑</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {/* Bulk mode: floating action bar */}
      {bulkMode && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center',
          background: 'var(--card)', border: '1.5px solid rgba(245,200,66,.45)',
          borderRadius: 24, padding: '10px 14px',
          boxShadow: '0 8px 32px rgba(0,0,0,.4)',
          maxWidth: 'calc(100vw - 24px)',
        }}>
          <span style={{ fontSize: '.8rem', color: 'var(--muted)', width: '100%', textAlign: 'center' }}>
            {selectedIds.size === 0 ? 'Seleziona prodotti' : `${selectedIds.size} selezionat${selectedIds.size === 1 ? 'o' : 'i'}`}
          </span>
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={() => setBulkShipFrom('spain')}
                disabled={bulkSaving}
                style={{ background: 'rgba(245,200,66,.12)', border: '1px solid rgba(245,200,66,.45)', color: '#f5c842', borderRadius: 20, padding: '6px 12px', fontFamily: 'inherit', fontWeight: 700, fontSize: '.8rem', cursor: 'pointer' }}
              >🇪🇸 Spagna</button>
              <button
                onClick={() => setBulkShipFrom('italy')}
                disabled={bulkSaving}
                style={{ background: 'rgba(61,255,110,.12)', border: '1px solid rgba(61,255,110,.45)', color: 'var(--green)', borderRadius: 20, padding: '6px 12px', fontFamily: 'inherit', fontWeight: 700, fontSize: '.8rem', cursor: 'pointer' }}
              >🇮🇹 Italia</button>
              <button
                onClick={() => setBulkShipFrom('pharma')}
                disabled={bulkSaving}
                style={{ background: 'rgba(129,140,248,.12)', border: '1px solid rgba(129,140,248,.45)', color: '#818cf8', borderRadius: 20, padding: '6px 12px', fontFamily: 'inherit', fontWeight: 700, fontSize: '.8rem', cursor: 'pointer' }}
              >💊 Pharma</button>
              <button
                onClick={openBulkPanel}
                disabled={bulkSaving}
                style={{ background: 'rgba(245,200,66,.15)', border: '1px solid rgba(245,200,66,.5)', color: 'var(--gold)', borderRadius: 20, padding: '6px 12px', fontFamily: 'inherit', fontWeight: 700, fontSize: '.8rem', cursor: 'pointer' }}
              >💶 Prezzi</button>
            </>
          )}
        </div>
      )}

      {/* Bulk price editor panel */}
      {bulkOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)' }} onClick={() => setBulkOpen(false)} />
          <div style={{
            position: 'relative', background: 'var(--bg2)', borderRadius: '20px 20px 0 0',
            padding: '0 0 32px', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            border: '1px solid var(--border)',
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 8px' }}>
              <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.05rem' }}>
                💶 Modifica prezzi — {selectedIds.size} prodott{selectedIds.size === 1 ? 'o' : 'i'}
              </div>
              <button
                onClick={() => setBulkOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1.2rem', cursor: 'pointer', padding: 4 }}
              >✕</button>
            </div>

            {/* Selected products summary */}
            <div style={{ padding: '0 16px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Array.from(selectedIds).map(id => {
                const p = products.find(x => x.id === id)
                return p ? (
                  <span key={id} style={{ fontSize: '.72rem', background: 'rgba(245,200,66,.1)', border: '1px solid rgba(245,200,66,.3)', borderRadius: 20, padding: '3px 10px', color: 'var(--gold)' }}>
                    {p.emoji} {p.name}
                  </span>
                ) : null
              })}
            </div>
            <div style={{ padding: '0 16px 10px', fontSize: '.72rem', color: 'var(--muted)' }}>
              I prezzi qui sotto verranno applicati a tutti i prodotti selezionati.
            </div>

            {/* One row per variant label */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(bulkSharedPrices).map(([label, price]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    fontSize: '.82rem', fontWeight: 700, color: 'var(--gold)',
                    background: 'rgba(245,200,66,.1)', border: '1px solid rgba(245,200,66,.25)',
                    borderRadius: 8, padding: '8px 14px', minWidth: 64, textAlign: 'center', flexShrink: 0,
                  }}>
                    {label}
                  </div>
                  <span style={{ fontSize: '.85rem', color: 'var(--muted)', flexShrink: 0 }}>€</span>
                  <input
                    type="number"
                    value={price || ''}
                    onChange={e => setBulkSharedPrices(prev => ({ ...prev, [label]: Number(e.target.value) }))}
                    style={{
                      flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '10px 14px', color: 'var(--text)',
                      fontSize: '1rem', fontFamily: 'inherit', outline: 'none', fontWeight: 700,
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Save button */}
            <div style={{ padding: '16px 16px 0' }}>
              <button
                onClick={saveBulkPrices}
                disabled={bulkSaving}
                style={{
                  width: '100%', padding: '15px', borderRadius: 14,
                  fontFamily: 'inherit', fontWeight: 700, fontSize: '1rem', cursor: bulkSaving ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg,rgba(245,200,66,.25),rgba(245,200,66,.12))',
                  border: '1.5px solid rgba(245,200,66,.6)',
                  color: 'var(--gold)', boxShadow: '0 0 20px rgba(245,200,66,.15)',
                }}
              >
                {bulkSaving ? '⏳ Salvataggio...' : `💾 Salva tutti i prezzi`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
