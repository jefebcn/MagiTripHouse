'use client'
import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'

export default function Lightbox() {
  const { lightboxSrc, lightboxType, lightboxCaption, closeLightbox } = useUIStore()
  const open = !!lightboxSrc

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLightbox() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, closeLightbox])

  if (!open) return null

  return (
    <div
      onClick={closeLightbox}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,.94)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, cursor: 'zoom-out', animation: 'fadeInUp .2s ease',
      }}
    >
      <button
        onClick={closeLightbox}
        style={{
          position: 'absolute', top: 14, right: 16,
          background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)',
          color: '#fff', fontSize: '1.2rem', borderRadius: '50%',
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', backdropFilter: 'blur(6px)',
        }}
      >
        ✕
      </button>

      {lightboxType === 'video' ? (
        <video
          src={lightboxSrc}
          controls
          autoPlay
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '100%', maxHeight: '90dvh', borderRadius: 10, boxShadow: '0 0 60px rgba(61,255,110,.15)' }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={lightboxSrc}
          alt={lightboxCaption}
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '100%', maxHeight: '90dvh', objectFit: 'contain',
            borderRadius: 10, boxShadow: '0 0 60px rgba(61,255,110,.15), 0 0 120px rgba(0,0,0,.8)',
            pointerEvents: 'none',
          }}
        />
      )}

      {lightboxCaption && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          fontFamily: "'Fredoka One', cursive", fontSize: '.9rem',
          color: 'rgba(255,255,255,.6)', letterSpacing: '.5px', whiteSpace: 'nowrap',
        }}>
          {lightboxCaption}
        </div>
      )}
    </div>
  )
}
