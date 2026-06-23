'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Product { id: string; name: string; imageUrl?: string; emoji: string; category: string }
interface Match { file: File; preview: string; productId: string; score: number }

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
}

function matchScore(filename: string, productName: string): number {
  // strip extension + numeric prefix added by our download script
  const fn = normalize(filename.replace(/\.[^.]+$/, '').replace(/^prodotto_\d+_/, ''))
  const pn = normalize(productName)
  const words = pn.split(' ').filter(w => w.length > 1)
  if (!words.length) return 0
  const hits = words.filter(w => fn.includes(w))
  return hits.length / words.length
}

export default function BulkImagesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/products?all=true')
      .then(r => r.json())
      .then(setProducts)
  }, [])

  function handleFiles(files: FileList | null) {
    if (!files || !products.length) return
    const result: Match[] = []

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const preview = URL.createObjectURL(file)

      let bestId = ''
      let bestScore = 0
      for (const p of products) {
        const s = matchScore(file.name, p.name)
        if (s > bestScore) { bestScore = s; bestId = p.id }
      }

      result.push({ file, preview, productId: bestId, score: bestScore })
    }

    // Sort by match score descending
    result.sort((a, b) => b.score - a.score)
    setMatches(result)
    setDone(false)
  }

  function setProductForMatch(idx: number, productId: string) {
    setMatches(m => m.map((x, i) => i === idx ? { ...x, productId } : x))
  }

  async function uploadAll() {
    const toUpload = matches.filter(m => m.productId)
    if (!toUpload.length) return
    setUploading(true)
    setProgress({ done: 0, total: toUpload.length })

    for (let i = 0; i < toUpload.length; i++) {
      const m = toUpload[i]
      try {
        // Upload image to R2
        const fd = new FormData()
        fd.append('file', m.file)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const { publicUrl } = await res.json()

        // Patch product with new imageUrl
        await fetch(`/api/products/${m.productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: publicUrl, mediaType: 'image' }),
        })
      } catch (e) {
        console.error('Failed for', m.file.name, e)
      }
      setProgress({ done: i + 1, total: toUpload.length })
    }

    setUploading(false)
    setDone(true)
  }

  const assigned   = matches.filter(m => m.productId)
  const unassigned = matches.filter(m => !m.productId)
  const highConf   = assigned.filter(m => m.score >= 0.6)
  const lowConf    = assigned.filter(m => m.score > 0 && m.score < 0.6)

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px 80px', fontFamily: 'DM Sans, sans-serif', color: 'var(--text)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Link href="/admin/products" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '1.2rem' }}>‹</Link>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem' }}>🖼️ Bulk Image Upload</span>
      </div>

      {/* Instructions */}
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text)' }}>Come funziona:</strong><br />
        1. Seleziona tutte le foto scaricate (anche 100+ in una volta)<br />
        2. L&apos;app abbina ogni immagine al prodotto corretto per nome<br />
        3. Controlla i match, correggi se serve, poi clicca Upload
      </div>

      {/* File picker */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />
      <button
        onClick={() => fileRef.current?.click()}
        style={{
          width: '100%', padding: '18px', borderRadius: 16, cursor: 'pointer',
          background: 'rgba(61,255,110,.08)', border: '2px dashed rgba(61,255,110,.35)',
          color: 'var(--green)', fontFamily: 'inherit', fontSize: '1rem', fontWeight: 700,
          marginBottom: 24,
        }}
      >
        📂 Seleziona foto ({products.length} prodotti caricati)
      </button>

      {/* Stats */}
      {matches.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Totale',       value: matches.length,     color: 'var(--text)' },
            { label: '✅ Alta conf.', value: highConf.length,    color: 'var(--green)' },
            { label: '⚠️ Bassa',     value: lowConf.length,     color: 'var(--gold)' },
            { label: '❌ Nessuno',   value: unassigned.length,  color: 'var(--red)' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '.62rem', color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Match list */}
      {matches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {matches.map((m, idx) => {
            const conf = m.score >= 0.6 ? 'green' : m.score > 0 ? 'gold' : 'red'
            const borderColor = conf === 'green' ? 'rgba(61,255,110,.3)' : conf === 'gold' ? 'rgba(245,200,66,.3)' : 'rgba(232,59,59,.25)'
            const matched = products.find(p => p.id === m.productId)
            return (
              <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--card)', border: `1px solid ${borderColor}`, borderRadius: 12, padding: '10px 12px' }}>
                {/* Thumbnail */}
                <div style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)', position: 'relative' }}>
                  <Image src={m.preview} alt="" fill style={{ objectFit: 'cover' }} unoptimized />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Filename */}
                  <div style={{ fontSize: '.66rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.file.name}
                  </div>

                  {/* Product dropdown */}
                  <select
                    value={m.productId}
                    onChange={e => setProductForMatch(idx, e.target.value)}
                    style={{
                      marginTop: 5, width: '100%', background: 'var(--bg3)',
                      border: `1px solid ${borderColor}`, borderRadius: 8,
                      padding: '6px 10px', color: matched ? 'var(--text)' : 'var(--muted)',
                      fontSize: '.78rem', fontFamily: 'inherit', outline: 'none',
                    }}
                  >
                    <option value="">— nessun abbinamento —</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Score badge */}
                <div style={{
                  flexShrink: 0, width: 38, textAlign: 'center',
                  fontSize: '.7rem', fontWeight: 700,
                  color: conf === 'green' ? 'var(--green)' : conf === 'gold' ? 'var(--gold)' : 'var(--red)',
                }}>
                  {m.score > 0 ? `${Math.round(m.score * 100)}%` : '—'}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload button */}
      {matches.length > 0 && !done && (
        <button
          onClick={uploadAll}
          disabled={uploading || assigned.length === 0}
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)', maxWidth: 528,
            padding: '16px', borderRadius: 14,
            background: uploading ? 'var(--bg3)' : 'linear-gradient(135deg, var(--green), #2fb344)',
            border: 'none', color: uploading ? 'var(--muted)' : '#000',
            fontFamily: "'Fredoka One', cursive", fontSize: '1rem', fontWeight: 700,
            cursor: uploading ? 'not-allowed' : 'pointer',
            boxShadow: uploading ? 'none' : 'var(--led-green)',
            zIndex: 100,
          }}
        >
          {uploading
            ? `⏳ Upload ${progress.done}/${progress.total}…`
            : `⬆️ Upload ${assigned.length} immagini`}
        </button>
      )}

      {/* Done */}
      {done && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
          <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.2rem', color: 'var(--green)' }}>
            {progress.total} immagini caricate!
          </div>
          <Link href="/admin/products" style={{ display: 'inline-block', marginTop: 16, color: 'var(--muted)', fontSize: '.85rem', textDecoration: 'none' }}>
            ← Torna ai prodotti
          </Link>
        </div>
      )}
    </div>
  )
}
