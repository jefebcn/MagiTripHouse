'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface NewsItem { id: string; title: string; content: string; emoji: string; imageUrl?: string; productLink?: string; createdAt: string }

export default function AdminNews() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [emoji, setEmoji] = useState('📢')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [productLink, setProductLink] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState('')

  const iStyle: React.CSSProperties = {
    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '11px 14px', color: 'var(--text)', fontSize: '.9rem', fontFamily: 'inherit', outline: 'none',
  }

  async function load() {
    const res = await fetch('/api/news')
    setNews(await res.json())
  }

  useEffect(() => { load() }, [])

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    const res = await fetch('/api/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, emoji, imageUrl: imageUrl.trim() || null, productLink: productLink.trim() || null }),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      setResult(`✅ Pubblicato!`)
      setTitle(''); setContent(''); setProductLink(''); setImageUrl(''); setEmoji('📢')
      load()
    } else {
      setResult(`❌ ${data.error ?? 'Errore'}`)
    }
    setTimeout(() => setResult(''), 4000)
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo post?')) return
    await fetch('/api/news', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setNews(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/admin" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '1.2rem' }}>‹</Link>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem' }}>📢 Pubblica nel Canale</span>
      </div>

      <form onSubmit={handlePublish} style={{
        background: 'var(--bg2)', border: '1px solid rgba(61,255,110,.2)',
        borderRadius: 'var(--radius)', padding: 16, marginBottom: 24,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="📢" value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={4}
            style={{ ...iStyle, width: 60, textAlign: 'center', fontSize: '1.2rem', padding: '11px 6px' }} />
          <input placeholder="Titolo del messaggio" value={title} onChange={e => setTitle(e.target.value)} required
            style={{ ...iStyle, flex: 1 }} />
        </div>
        <textarea placeholder="Testo del messaggio..." value={content} onChange={e => setContent(e.target.value)}
          required rows={5} style={{ ...iStyle, resize: 'vertical' }} />
        <input placeholder="URL immagine (opzionale)" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
          style={iStyle} />
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="preview" style={{ width: '100%', borderRadius: 10, maxHeight: 200, objectFit: 'cover' }} />
        )}
        <input placeholder="Link prodotto (opzionale)" value={productLink} onChange={e => setProductLink(e.target.value)}
          style={iStyle} />
        {result && (
          <div style={{ fontSize: '.85rem', textAlign: 'center', color: result.startsWith('✅') ? 'var(--green)' : 'var(--red)' }}>
            {result}
          </div>
        )}
        <button type="submit" disabled={saving} style={{
          padding: '13px', borderRadius: 10, fontFamily: 'inherit', fontWeight: 700,
          fontSize: '1rem', cursor: saving ? 'default' : 'pointer',
          background: 'rgba(61,255,110,.18)', border: '1.5px solid rgba(61,255,110,.5)',
          color: 'var(--green)', boxShadow: '0 0 16px rgba(61,255,110,.1)',
        }}>
          {saving ? 'Pubblicazione...' : '🚀 Pubblica & Invia Push'}
        </button>
      </form>

      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', marginBottom: 12 }}>
        Pubblicati ({news.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {news.map(item => (
          <div key={item.id} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{item.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 2 }}>{item.title}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--muted)', lineHeight: 1.5 }}>{item.content}</div>
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" style={{ marginTop: 8, width: '100%', borderRadius: 8, maxHeight: 140, objectFit: 'cover' }} />
                )}
                <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginTop: 6, opacity: .7 }}>
                  {new Date(item.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <button onClick={() => handleDelete(item.id)} style={{
                background: 'rgba(232,59,59,.1)', border: '1px solid rgba(232,59,59,.2)',
                borderRadius: 8, padding: '5px 10px', color: 'var(--red)',
                fontFamily: 'inherit', fontSize: '.72rem', cursor: 'pointer', flexShrink: 0,
              }}>🗑 Elimina</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
