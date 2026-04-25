'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface NewsItem { id: string; title: string; content: string; emoji: string; createdAt: string }

export default function AdminNews() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [emoji, setEmoji] = useState('📢')
  const [productLink, setProductLink] = useState('')
  const [saving, setSaving] = useState(false)
  const [pushResult, setPushResult] = useState('')

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
      body: JSON.stringify({ title, content, emoji, productLink: productLink || null }),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      setPushResult(`✅ Pubblicato! ID: ${data.id}`)
      setTitle(''); setContent(''); setProductLink(''); setEmoji('📢')
      load()
    } else {
      setPushResult('❌ Errore nella pubblicazione')
    }
    setTimeout(() => setPushResult(''), 4000)
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/admin" style={{ color: 'var(--muted)', textDecoration: 'none', fontSize: '1.2rem' }}>‹</Link>
        <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem' }}>📢 Pubblica Novità</span>
      </div>

      <form onSubmit={handlePublish} style={{ background: 'var(--bg2)', border: '1px solid rgba(61,255,110,.2)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Emoji"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
            style={{ width: 60, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 10px', color: 'var(--text)', fontSize: '1.2rem', textAlign: 'center', fontFamily: 'inherit', outline: 'none' }}
          />
          <input
            placeholder="Titolo della novità"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: '.9rem', fontFamily: 'inherit', outline: 'none' }}
          />
        </div>
        <textarea
          placeholder="Descrizione della novità..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={4}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: '.9rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
        />
        <input
          placeholder="Link prodotto (opzionale)"
          value={productLink}
          onChange={(e) => setProductLink(e.target.value)}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: '.9rem', fontFamily: 'inherit', outline: 'none' }}
        />

        {pushResult && (
          <div style={{ fontSize: '.82rem', textAlign: 'center', color: pushResult.startsWith('✅') ? 'var(--green)' : 'var(--red)' }}>
            {pushResult}
          </div>
        )}

        <button type="submit" disabled={saving} className="checkout-btn">
          {saving ? 'Pubblicazione...' : '🚀 Pubblica & Invia Notifica Push'}
        </button>
      </form>

      {/* History */}
      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', marginBottom: 12 }}>
        Pubblicati ({news.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {news.map((item) => (
          <div key={item.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: '1.1rem' }}>{item.emoji}</span>
              <span style={{ fontWeight: 600, fontSize: '.88rem' }}>{item.title}</span>
            </div>
            <div style={{ fontSize: '.75rem', color: 'var(--muted)', lineHeight: 1.5 }}>{item.content}</div>
            <div style={{ fontSize: '.65rem', color: 'var(--muted)', marginTop: 6, opacity: .7 }}>
              {new Date(item.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
