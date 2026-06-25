'use client'
import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Variant { label: string; price: number }
interface BundleItem { productId: string; productName: string; emoji: string; qty: number }
interface PricePreset { name: string; variants: Variant[] }

// Listini di default (modificabili e salvabili dall'admin, persistiti in localStorage)
const DEFAULT_PRESETS: PricePreset[] = [
  {
    name: 'Cali Spain',
    variants: [
      { label: '10g', price: 110 },
      { label: '25g', price: 200 },
      { label: '50g', price: 350 },
      { label: '100g', price: 600 },
      { label: '250g', price: 1350 },
      { label: '500g', price: 2500 },
    ],
  },
  {
    name: 'Frozen',
    variants: [
      { label: '5g',   price: 70 },
      { label: '10g',  price: 110 },
      { label: '25g',  price: 240 },
      { label: '50g',  price: 390 },
      { label: '100g', price: 680 },
      { label: '200g', price: 1250 },
      { label: '300g', price: 1750 },
      { label: '500g', price: 2800 },
      { label: '1kg',  price: 5100 },
    ],
  },
  {
    name: 'Cali Bag',
    variants: [
      { label: '3.5g', price: 60 },
      { label: '7g',   price: 95 },
      { label: '14g',  price: 160 },
      { label: '28g',  price: 280 },
      { label: '56g',  price: 510 },
      { label: '112g', price: 950 },
      { label: '224g', price: 1750 },
    ],
  },
  {
    name: 'Dry',
    variants: [
      { label: '10g', price: 75 },
      { label: '25g', price: 160 },
      { label: '50g', price: 290 },
      { label: '100g', price: 490 },
      { label: '200g', price: 850 },
      { label: '300g', price: 1200 },
      { label: '500g', price: 1850 },
      { label: '1kg', price: 3300 },
      { label: '2kg', price: 6200 },
      { label: '3kg', price: 9200 },
      { label: '5kg', price: 14900 },
    ],
  },
]
const PRESETS_KEY = 'tp_price_presets'
const PRESETS_SEED_KEY = 'tp_price_presets_seeded'

const ORIGIN_GROUPS: { key: string; label: string; color: string }[] = [
  { key: 'spain',  label: '🇪🇸 Spagna',   color: '#f5c842' },
  { key: 'italy',  label: '🇮🇹 Italia',    color: '#3dff6e' },
  { key: 'pharma', label: '💊 Pharma EU',  color: '#818cf8' },
  { key: 'meetup', label: '🤝 In loco',    color: '#c084fc' },
]
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
  const quickUploadRef = useRef<HTMLInputElement>(null)
  const [quickUploadId, setQuickUploadId] = useState<string | null>(null)
  const [quickUploadProgress, setQuickUploadProgress] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const dragIdxRef = useRef<number | null>(null)
  const hoverIdxRef = useRef<number | null>(null)

  // Ricerca + filtri lista
  const [search, setSearch] = useState('')
  const [originFilter, setOriginFilter] = useState<'all' | 'spain' | 'italy' | 'pharma' | 'meetup'>('all')
  const [catFilter, setCatFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'visible' | 'hidden' | 'sale' | 'soon' | 'out'>('all')
  const q = search.trim().toLowerCase()

  // Gruppi collassabili (persistiti in localStorage)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  // Menu azioni rapide per prodotto
  const [quickMenuId, setQuickMenuId] = useState<string | null>(null)

  // Bulk price edit
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  // shared prices: label → price (applies to ALL selected products that have that label)
  const [bulkSharedPrices, setBulkSharedPrices] = useState<Record<string, number>>({})
  const [bulkSaving, setBulkSaving] = useState(false)

  // Modifica prezzo inline (dalla riga)
  const [priceEditId, setPriceEditId] = useState<string | null>(null)
  const [priceEditVariants, setPriceEditVariants] = useState<Variant[]>([])
  const [priceSaving, setPriceSaving] = useState(false)

  // Listini prezzi (presets) — persistiti in localStorage
  const [presets, setPresets] = useState<PricePreset[]>([])
  const [presetsLoaded, setPresetsLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESETS_KEY)
      if (!raw) {
        // Primo avvio: semina tutti i default
        setPresets(DEFAULT_PRESETS.map(d => ({ ...d })))
        localStorage.setItem(PRESETS_SEED_KEY, JSON.stringify(DEFAULT_PRESETS.map(d => d.name)))
      } else {
        const stored: PricePreset[] = JSON.parse(raw)
        const seeded: string[] = JSON.parse(localStorage.getItem(PRESETS_SEED_KEY) ?? '[]')
        // Aggiungi i default mai seminati prima (così i nuovi listini compaiono una volta sola,
        // senza ricomparire se l'admin li ha già eliminati)
        const toAdd = DEFAULT_PRESETS.filter(d => !seeded.includes(d.name) && !stored.some(s => s.name === d.name))
        setPresets([...stored, ...toAdd.map(d => ({ ...d }))])
        localStorage.setItem(PRESETS_SEED_KEY, JSON.stringify(Array.from(new Set([...seeded, ...DEFAULT_PRESETS.map(d => d.name)]))))
      }
    } catch { setPresets(DEFAULT_PRESETS.map(d => ({ ...d }))) }
    setPresetsLoaded(true)
  }, [])

  useEffect(() => {
    if (!presetsLoaded) return
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)) } catch {}
  }, [presets, presetsLoaded])

  // Applica un listino al form (sostituisce completamente i tagli)
  function applyPresetToForm(p: PricePreset) {
    setForm(f => ({ ...f, variants: p.variants.map(v => ({ ...v })) }))
  }

  // Applica un listino alla modifica inline (riempie solo i prezzi dei tagli già presenti)
  function applyPresetToInline(p: PricePreset) {
    setPriceEditVariants(prev => prev.map(v => {
      const match = p.variants.find(pv => pv.label === v.label)
      return match ? { ...v, price: match.price } : v
    }))
  }

  // Applica un listino al pannello bulk (riempie i prezzi delle etichette condivise)
  function applyPresetToBulk(p: PricePreset) {
    setBulkSharedPrices(prev => {
      const next = { ...prev }
      p.variants.forEach(v => { if (next[v.label] !== undefined) next[v.label] = v.price })
      return next
    })
  }

  // Salva i tagli correnti del form come nuovo listino
  function saveFormAsPreset() {
    const valid = form.variants.filter(v => v.label.trim())
    if (!valid.length) { alert('Aggiungi almeno un taglio con etichetta prima di salvare il listino.'); return }
    const name = prompt('Nome del listino (es. "Online std", "Hash", "Pharma"):')?.trim()
    if (!name) return
    setPresets(prev => [...prev.filter(p => p.name !== name), { name, variants: valid.map(v => ({ ...v })) }])
  }

  function deletePreset(name: string) {
    if (!confirm(`Eliminare il listino "${name}"?`)) return
    setPresets(prev => prev.filter(p => p.name !== name))
  }

  function startPriceEdit(p: Product) {
    setPriceEditId(p.id)
    setPriceEditVariants(p.variants.map(v => ({ ...v })))
  }

  async function savePriceEdit(id: string) {
    setPriceSaving(true)
    try {
      await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants: priceEditVariants }),
      })
      setPriceEditId(null)
      await load()
    } finally {
      setPriceSaving(false)
    }
  }

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

  // Upload rapido dalla card — carica e salva imageUrl direttamente sul prodotto
  async function handleQuickUpload(e: React.ChangeEvent<HTMLInputElement>, productId: string) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setQuickUploadProgress(5)
    const workerUrl = process.env.NEXT_PUBLIC_UPLOAD_WORKER_URL
    try {
      let publicUrl: string
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image'
      if (workerUrl) {
        publicUrl = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('POST', workerUrl)
          xhr.setRequestHeader('X-Filename', file.name)
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
          xhr.timeout = 600_000
          xhr.upload.onprogress = ev => {
            if (ev.lengthComputable) setQuickUploadProgress(5 + Math.round((ev.loaded / ev.total) * 85))
          }
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try { resolve(JSON.parse(xhr.responseText).publicUrl) }
              catch { reject(new Error('Risposta Worker non valida')) }
            } else { reject(new Error(`Worker errore ${xhr.status}`)) }
          }
          xhr.onerror = () => reject(new Error('Errore di rete'))
          xhr.ontimeout = () => reject(new Error('Timeout upload'))
          xhr.send(file)
        })
      } else {
        if (file.size > 4 * 1024 * 1024) throw new Error(`File troppo grande (max 4MB senza Worker)`)
        setQuickUploadProgress(30)
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `Errore ${res.status}`) }
        publicUrl = (await res.json()).publicUrl
      }
      setQuickUploadProgress(95)
      await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: publicUrl, mediaType }),
      })
      setQuickUploadProgress(100)
      await load()
    } catch (err: any) {
      alert(`⚠️ Upload fallito: ${err.message}`)
    }
    setTimeout(() => { setQuickUploadId(null); setQuickUploadProgress(0) }, 600)
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

  // Duplica un prodotto — copia tutto, aggiunge "(copia)", nascosto di default
  async function duplicateProduct(p: Product) {
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: p.name + ' (copia)',
        description: p.description ?? '',
        category: p.category,
        tags: p.tags,
        variants: p.variants,
        stock: p.stock ?? null,
        imageUrl: p.imageUrl ?? '',
        mediaType: p.mediaType ?? 'image',
        emoji: p.emoji,
        badge: p.badge ?? '',
        origin: p.origin ?? '',
        isOnSale: false,
        isComingSoon: false,
        hidden: true,
        shipFrom: p.shipFrom ?? 'spain',
        bundleItems: p.bundleItems ?? null,
      }),
    })
    await load()
  }

  // Seleziona tutti i prodotti di un gruppo ed entra in modalità bulk
  function selectAllGroup(shipFrom: string) {
    const ids = displayedProducts
      .filter(p => (p.shipFrom ?? 'spain') === shipFrom)
      .map(p => p.id)
    setBulkMode(true)
    setSelectedIds(new Set(ids))
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

  async function setBulkShipFrom(shipFrom: 'spain' | 'italy' | 'pharma' | 'meetup') {
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

  // Applica un intero listino (tagli + prezzi) a tutti i prodotti selezionati con un click.
  // Sostituisce i tagli esistenti — pensato per stampare un listino standard su prodotti già in sistema.
  async function applyPresetToSelected(preset: PricePreset) {
    const summary = preset.variants.map(v => `${v.label} €${v.price}`).join(' · ')
    if (!confirm(`Applicare il listino "${preset.name}" a ${selectedIds.size} prodott${selectedIds.size === 1 ? 'o' : 'i'}?\n\n${summary}\n\n⚠️ I tagli/prezzi attuali di questi prodotti verranno sostituiti.`)) return
    setBulkSaving(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          fetch(`/api/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variants: preset.variants.map(v => ({ ...v })) }),
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

  const displayedProducts = products.filter(p => {
    if (comboMode && p.category !== 'combo') return false
    if (originFilter !== 'all' && (p.shipFrom ?? 'spain') !== originFilter) return false
    if (catFilter !== 'all' && p.category !== catFilter) return false
    if (statusFilter === 'visible' && p.hidden) return false
    if (statusFilter === 'hidden' && !p.hidden) return false
    if (statusFilter === 'sale' && !p.isOnSale) return false
    if (statusFilter === 'soon' && !p.isComingSoon) return false
    if (statusFilter === 'out' && p.stock !== 0) return false
    if (q) {
      const hay = `${p.name} ${p.origin ?? ''} ${(p.tags || []).join(' ')} ${p.category}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  // In vista filtrata/ricerca disabilito il drag (l'ordine non avrebbe senso) e mostro griglia multi-colonna
  const isFiltering = !comboMode && (q !== '' || originFilter !== 'all' || catFilter !== 'all' || statusFilter !== 'all')

  // Card compatta per ogni prodotto — usata sia nella vista gruppi che in quella flat
  function renderCard(p: Product) {
    const isSelected = selectedIds.has(p.id)
    const isEditingPrice = priceEditId === p.id
    const showMenu = quickMenuId === p.id && !bulkMode

    return (
      <div
        key={p.id}
        onClick={bulkMode ? () => toggleSelect(p.id) : undefined}
        style={{
          padding: '9px 12px',
          background: isSelected ? 'rgba(245,200,66,.07)' : 'var(--card)',
          borderBottom: '1px solid rgba(255,255,255,.04)',
          opacity: p.hidden && !isSelected && !isEditingPrice ? 0.48 : 1,
          cursor: bulkMode ? 'pointer' : 'default',
          transition: 'opacity .15s, background .1s',
          userSelect: 'none',
        }}
      >
        {/* Riga principale */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {/* Checkbox bulk */}
          {bulkMode && (
            <div style={{
              flexShrink: 0, width: 22, height: 22, borderRadius: 6,
              border: `2px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
              background: isSelected ? 'rgba(245,200,66,.2)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--gold)', fontSize: '.85rem',
            }}>
              {isSelected && '✓'}
            </div>
          )}

          {/* Thumbnail — con progress ring durante upload rapido */}
          <div style={{ width: 36, height: 36, borderRadius: 7, overflow: 'hidden', background: 'var(--bg3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {quickUploadId === p.id && quickUploadProgress > 0 && quickUploadProgress < 100 ? (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2.5px solid rgba(61,255,110,.25)', borderTopColor: 'var(--green)', animation: 'spin 0.7s linear infinite' }} />
                <span style={{ fontSize: '.55rem', color: 'var(--green)', fontWeight: 700 }}>{quickUploadProgress}%</span>
              </div>
            ) : p.imageUrl
              ? p.mediaType === 'video'
                ? <span style={{ fontSize: '1rem' }}>▶</span>
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={p.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '1rem' }}>{p.emoji}</span>
            }
          </div>

          {/* Nome + badge */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: p.hidden ? 'var(--muted)' : 'var(--text)' }}>
              {p.name}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 1, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '.62rem', color: 'var(--muted)', background: 'var(--bg3)', borderRadius: 4, padding: '1px 5px' }}>{p.category}</span>
              {p.isOnSale && <span style={{ fontSize: '.65rem' }}>🏷</span>}
              {p.isComingSoon && <span style={{ fontSize: '.65rem' }}>🕐</span>}
              {p.stock === 0 && <span style={{ fontSize: '.65rem' }}>⛔</span>}
              {p.stock != null && p.stock > 0 && <span style={{ fontSize: '.62rem', color: 'var(--muted)' }}>📦{p.stock}</span>}
            </div>
          </div>

          {/* Azioni rapide (non in bulk) */}
          {!bulkMode && (
            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
              {/* Toggle visibilità */}
              <button
                onClick={async (e) => {
                  e.stopPropagation()
                  await fetch(`/api/products/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hidden: !p.hidden }) })
                  load()
                }}
                title={p.hidden ? 'Pubblica' : 'Nascondi'}
                style={{
                  width: 30, height: 30, borderRadius: 6, border: '1px solid', cursor: 'pointer',
                  background: p.hidden ? 'rgba(106,138,106,.1)' : 'rgba(61,255,110,.1)',
                  borderColor: p.hidden ? 'rgba(106,138,106,.3)' : 'rgba(61,255,110,.3)',
                  color: p.hidden ? 'var(--muted)' : 'var(--green)', fontSize: '.82rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >{p.hidden ? '🙈' : '👁'}</button>

              {/* Menu ⋯ */}
              <button
                onClick={(e) => { e.stopPropagation(); setQuickMenuId(showMenu ? null : p.id) }}
                style={{
                  width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer',
                  background: showMenu ? 'var(--bg2)' : 'var(--bg3)',
                  color: showMenu ? 'var(--text)' : 'var(--muted)', fontSize: '1.1rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >⋯</button>
            </div>
          )}
        </div>

        {/* Prezzi (riga secondaria, non in modalità edit) */}
        {!isEditingPrice && (
          <div style={{ marginTop: 4, paddingLeft: bulkMode ? 31 : 45, fontSize: '.68rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.category === 'combo' && p.bundleItems?.length
              ? p.bundleItems.map(b => `${b.qty}× ${b.productName}`).join(' + ')
              : p.variants.map(v => `${v.label} €${v.price}`).join(' · ')}
          </div>
        )}

        {/* Modifica prezzi inline */}
        {isEditingPrice && (
          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {presets.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {presets.map(pr => (
                  <button key={pr.name} onClick={() => applyPresetToInline(pr)}
                    style={{ background: 'rgba(61,255,110,.08)', border: '1px solid rgba(61,255,110,.3)', borderRadius: 6, padding: '3px 8px', color: 'var(--green)', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >📋 {pr.name}</button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {priceEditVariants.map((v, vi) => (
                <div key={vi} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg3)', border: '1px solid rgba(245,200,66,.35)', borderRadius: 8, padding: '3px 6px' }}>
                  <span style={{ fontSize: '.7rem', color: 'var(--muted)' }}>{v.label}</span>
                  <span style={{ fontSize: '.7rem', color: 'var(--muted)' }}>€</span>
                  <input
                    type="number" autoFocus={vi === 0} value={v.price || ''}
                    onChange={(e) => { const nv = [...priceEditVariants]; nv[vi] = { ...nv[vi], price: Number(e.target.value) }; setPriceEditVariants(nv) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') savePriceEdit(p.id) }}
                    style={{ width: 56, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', color: 'var(--text)', fontSize: '.78rem', fontFamily: 'inherit', outline: 'none', fontWeight: 700 }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => savePriceEdit(p.id)} disabled={priceSaving}
                style={{ flex: 1, background: 'rgba(61,255,110,.15)', border: '1px solid rgba(61,255,110,.45)', borderRadius: 8, padding: '8px', cursor: 'pointer', color: 'var(--green)', fontFamily: 'inherit', fontWeight: 700, fontSize: '.82rem' }}
              >{priceSaving ? '⏳ Salvataggio...' : '💾 Salva prezzi'}</button>
              <button onClick={() => setPriceEditId(null)}
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: 'var(--muted)', fontFamily: 'inherit' }}
              >✕</button>
            </div>
          </div>
        )}

        {/* Menu azioni rapide (dropdown inline) */}
        {showMenu && (
          <div onClick={(e) => e.stopPropagation()}
            style={{ marginTop: 8, paddingLeft: 45, display: 'flex', gap: 6, flexWrap: 'wrap' }}
          >
            {/* Foto/Video — upload rapido senza aprire il form */}
            <button
              onClick={() => { setQuickUploadId(p.id); setQuickMenuId(null); quickUploadRef.current?.click() }}
              style={{ background: 'rgba(56,189,248,.1)', border: '1px solid rgba(56,189,248,.35)', borderRadius: 8, padding: '7px 11px', color: '#7dd3fc', fontFamily: 'inherit', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer' }}
            >📸 Foto/Video</button>
            {p.category !== 'combo' && (
              <button onClick={() => { startPriceEdit(p); setQuickMenuId(null) }}
                style={{ background: 'rgba(245,200,66,.1)', border: '1px solid rgba(245,200,66,.3)', borderRadius: 8, padding: '7px 11px', color: 'var(--gold)', fontFamily: 'inherit', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer' }}
              >💶 Prezzi</button>
            )}
            <button onClick={() => { startEdit(p); setQuickMenuId(null) }}
              style={{ background: 'rgba(245,200,66,.1)', border: '1px solid rgba(245,200,66,.3)', borderRadius: 8, padding: '7px 11px', color: 'var(--gold)', fontFamily: 'inherit', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer' }}
            >✏️ Modifica</button>
            <button onClick={() => { duplicateProduct(p); setQuickMenuId(null) }}
              style={{ background: 'rgba(61,255,110,.08)', border: '1px solid rgba(61,255,110,.3)', borderRadius: 8, padding: '7px 11px', color: 'var(--green)', fontFamily: 'inherit', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer' }}
            >📋 Duplica</button>
            <button onClick={() => { handleDelete(p.id); setQuickMenuId(null) }}
              style={{ background: 'rgba(232,59,59,.1)', border: '1px solid rgba(232,59,59,.3)', borderRadius: 8, padding: '7px 11px', color: 'var(--red)', fontFamily: 'inherit', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer' }}
            >🗑 Elimina</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 'min(960px, 100%)', margin: '0 auto', padding: '20px 16px 80px' }}>
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
            {/* Input nascosto per upload rapido dalla card */}
            <input
              ref={quickUploadRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={(e) => quickUploadId ? handleQuickUpload(e, quickUploadId) : undefined}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([
                { id: 'spain',  label: '🇪🇸 Spagna',    color: '#f5c842' },
                { id: 'italy',  label: '🇮🇹 Italia',    color: '#3dff6e' },
                { id: 'pharma', label: '💊 Pharma EU',  color: '#818cf8' },
                { id: 'meetup', label: '🤝 In loco',    color: '#c084fc' },
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Tagli & Prezzi</div>
              <button
                type="button"
                onClick={saveFormAsPreset}
                title="Salva i tagli correnti come listino riutilizzabile"
                style={{ background: 'rgba(245,200,66,.1)', border: '1px solid rgba(245,200,66,.3)', borderRadius: 7, padding: '4px 9px', color: 'var(--gold)', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >💾 Salva come listino</button>
            </div>

            {/* Listini rapidi — un click riempie tutti i tagli & prezzi */}
            {presets.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {presets.map(p => (
                  <span key={p.name} style={{ display: 'inline-flex', alignItems: 'stretch', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(61,255,110,.3)' }}>
                    <button
                      type="button"
                      onClick={() => applyPresetToForm(p)}
                      title={p.variants.map(v => `${v.label} €${v.price}`).join(' · ')}
                      style={{ background: 'rgba(61,255,110,.08)', border: 'none', padding: '6px 10px', color: 'var(--green)', fontSize: '.74rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                    >📋 {p.name}</button>
                    <button
                      type="button"
                      onClick={() => deletePreset(p.name)}
                      title="Elimina listino"
                      style={{ background: 'rgba(232,59,59,.08)', border: 'none', borderLeft: '1px solid rgba(61,255,110,.2)', padding: '0 7px', color: 'var(--red)', fontSize: '.72rem', cursor: 'pointer', fontFamily: 'inherit' }}
                    >✕</button>
                  </span>
                ))}
              </div>
            )}

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

      {/* Barra ricerca + filtri */}
      {!bulkMode && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--bg)', paddingTop: 4, paddingBottom: 10, marginBottom: 10,
          display: 'flex', flexDirection: 'column', gap: 8,
          borderBottom: '1px solid var(--border)',
        }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '.95rem', opacity: .7 }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome, tag, origine…"
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 38px 11px 38px', color: 'var(--text)', fontSize: '.9rem', fontFamily: 'inherit', outline: 'none' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', fontSize: '1rem', cursor: 'pointer', padding: 6 }}
              >✕</button>
            )}
          </div>

          {/* Filtri rapidi */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {([
              { id: 'all',    label: 'Tutti',  color: 'var(--green)' },
              { id: 'spain',  label: '🇪🇸',     color: '#f5c842' },
              { id: 'italy',  label: '🇮🇹',     color: '#3dff6e' },
              { id: 'pharma', label: '💊',     color: '#818cf8' },
              { id: 'meetup', label: '🤝',     color: '#c084fc' },
            ] as const).map(o => {
              const active = originFilter === o.id
              return (
                <button
                  key={o.id}
                  onClick={() => setOriginFilter(o.id)}
                  style={{
                    flexShrink: 0, borderRadius: 18, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '.78rem', fontWeight: 700,
                    background: active ? `${o.color === 'var(--green)' ? 'rgba(61,255,110,.18)' : o.color + '22'}` : 'var(--bg3)',
                    color: active ? o.color : 'var(--muted)',
                    border: `1px solid ${active ? (o.color === 'var(--green)' ? 'rgba(61,255,110,.6)' : o.color + '88') : 'var(--border)'}`,
                  }}
                >{o.label}</button>
              )
            })}

            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 18, padding: '6px 10px', color: catFilter === 'all' ? 'var(--muted)' : 'var(--text)', fontSize: '.78rem', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">📂 Categoria</option>
              {['premium','frozen','new','hash','cbd','combo','injectable','oral','sarms','peptides','pct','request'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 18, padding: '6px 10px', color: statusFilter === 'all' ? 'var(--muted)' : 'var(--text)', fontSize: '.78rem', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
            >
              <option value="all">🔖 Stato</option>
              <option value="visible">👁 Visibili</option>
              <option value="hidden">🙈 Nascosti</option>
              <option value="sale">🏷 In sconto</option>
              <option value="soon">🕐 In arrivo</option>
              <option value="out">⛔ Esauriti</option>
            </select>

            <span style={{ marginLeft: 'auto', fontSize: '.74rem', color: 'var(--muted)', fontWeight: 600 }}>
              {displayedProducts.length}{isFiltering ? `/${products.length}` : ''} prodotti
            </span>
          </div>
        </div>
      )}

      {/* Espandi / collassa tutti i gruppi */}
      {!isFiltering && !comboMode && !bulkMode && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 6, justifyContent: 'flex-end' }}>
          <button onClick={() => setCollapsedGroups(new Set())}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '.7rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            ▼ Espandi tutti
          </button>
          <button onClick={() => setCollapsedGroups(new Set(ORIGIN_GROUPS.map(g => g.key)))}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '.7rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            ▶ Collassa tutti
          </button>
        </div>
      )}

      {/* Drag hint — solo in flat ordinata */}
      {(isFiltering || comboMode) && !bulkMode && displayedProducts.length > 1 && (
        <div style={{ fontSize: '.72rem', color: 'var(--muted)', textAlign: 'center', marginBottom: 8, opacity: .7 }}>
          ☰ Tieni premuto e trascina per riordinare
        </div>
      )}

      {/* VISTA GRUPPI (default) — oppure FLAT (filtri attivi o combo mode) */}
      {isFiltering || comboMode ? (
        /* ── FLAT: griglia quando filtri attivi, lista in combo mode ── */
        <div
          ref={listRef}
          style={isFiltering
            ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }
            : { display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}
          onTouchMove={onDragTouchMove}
          onTouchEnd={onDragTouchEnd}
          onTouchCancel={onDragTouchEnd}
        >
          {displayedProducts.map(p => renderCard(p))}
        </div>
      ) : (
        /* ── GRUPPI per origine ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ORIGIN_GROUPS.map(group => {
            const groupItems = displayedProducts.filter(p => (p.shipFrom ?? 'spain') === group.key)
            if (groupItems.length === 0) return null
            const collapsed = collapsedGroups.has(group.key)
            const hiddenCount = groupItems.filter(p => p.hidden).length
            const visibleCount = groupItems.length - hiddenCount
            // Visibili prima, nascosti in fondo
            const sorted = [...groupItems.filter(p => !p.hidden), ...groupItems.filter(p => p.hidden)]

            return (
              <div key={group.key}>
                {/* Header gruppo */}
                <div
                  onClick={() => setCollapsedGroups(prev => {
                    const next = new Set(prev)
                    if (next.has(group.key)) next.delete(group.key)
                    else next.add(group.key)
                    return next
                  })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px',
                    background: `${group.color}0e`,
                    border: `1px solid ${group.color}35`,
                    borderRadius: collapsed ? 12 : '12px 12px 0 0',
                    cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: '.75rem', color: group.color, flexShrink: 0, width: 10 }}>
                    {collapsed ? '▶' : '▼'}
                  </span>
                  <span style={{ fontWeight: 700, color: group.color, fontSize: '.88rem', flex: 1 }}>
                    {group.label}
                  </span>
                  {/* Badge: N visibili [+ M nascosti] */}
                  <span style={{
                    fontSize: '.7rem', fontWeight: 700, flexShrink: 0,
                    background: `${group.color}20`, border: `1px solid ${group.color}44`,
                    color: group.color, borderRadius: 20, padding: '2px 9px',
                  }}>
                    {visibleCount} {hiddenCount > 0 ? <span style={{ opacity: .65 }}>+{hiddenCount}🙈</span> : null}
                  </span>
                  {/* Seleziona tutto il gruppo */}
                  <button
                    onClick={(e) => { e.stopPropagation(); selectAllGroup(group.key) }}
                    style={{
                      background: `${group.color}18`, border: `1px solid ${group.color}55`,
                      color: group.color, borderRadius: 10, padding: '4px 9px',
                      fontFamily: 'inherit', fontSize: '.7rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                    }}
                  >☑ Tutti</button>
                </div>

                {/* Prodotti del gruppo */}
                {!collapsed && (
                  <div style={{
                    border: `1px solid ${group.color}22`,
                    borderTop: 'none',
                    borderRadius: '0 0 12px 12px',
                    overflow: 'hidden',
                  }}>
                    {sorted.map(p => renderCard(p))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
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
              {/* Gruppo: listino prezzi — un click applica tutto il listino ai selezionati */}
              <div style={{ width: '100%', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '.68rem', color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', opacity: .8 }}>💶 Listino</span>
                {presets.map(pr => (
                  <button
                    key={pr.name}
                    onClick={() => applyPresetToSelected(pr)}
                    disabled={bulkSaving}
                    title={pr.variants.map(v => `${v.label} €${v.price}`).join(' · ')}
                    style={{ background: 'rgba(61,255,110,.14)', border: '1px solid rgba(61,255,110,.5)', color: 'var(--green)', borderRadius: 20, padding: '6px 12px', fontFamily: 'inherit', fontWeight: 700, fontSize: '.8rem', cursor: bulkSaving ? 'not-allowed' : 'pointer' }}
                  >{pr.name}</button>
                ))}
                <button
                  onClick={openBulkPanel}
                  disabled={bulkSaving}
                  title="Modifica i prezzi a mano taglio per taglio"
                  style={{ background: 'rgba(245,200,66,.15)', border: '1px solid rgba(245,200,66,.5)', color: 'var(--gold)', borderRadius: 20, padding: '6px 12px', fontFamily: 'inherit', fontWeight: 700, fontSize: '.8rem', cursor: 'pointer' }}
                >✏️ Manuale</button>
              </div>

              {/* Gruppo: spedizione */}
              <div style={{ width: '100%', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '.68rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', opacity: .8 }}>🚚 Spedizione</span>
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
                  onClick={() => setBulkShipFrom('meetup')}
                  disabled={bulkSaving}
                  style={{ background: 'rgba(192,132,252,.12)', border: '1px solid rgba(192,132,252,.45)', color: '#c084fc', borderRadius: 20, padding: '6px 12px', fontFamily: 'inherit', fontWeight: 700, fontSize: '.8rem', cursor: 'pointer' }}
                >🤝 In loco</button>
              </div>
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

            {/* Listini rapidi nel bulk */}
            {presets.length > 0 && (
              <div style={{ padding: '0 16px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '.7rem', color: 'var(--muted)', fontWeight: 600 }}>Listino:</span>
                {presets.map(pr => (
                  <button
                    key={pr.name}
                    onClick={() => applyPresetToBulk(pr)}
                    title={pr.variants.map(v => `${v.label} €${v.price}`).join(' · ')}
                    style={{ background: 'rgba(61,255,110,.08)', border: '1px solid rgba(61,255,110,.3)', borderRadius: 7, padding: '4px 10px', color: 'var(--green)', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >📋 {pr.name}</button>
                ))}
              </div>
            )}

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
