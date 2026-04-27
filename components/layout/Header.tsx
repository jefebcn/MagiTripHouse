'use client'
import React from 'react'
import Image from 'next/image'

// Particles: angle in degrees (0 = up), distance in px
const PARTICLES = [
  { emoji: '✨', angle: -90, dist: 90 },
  { emoji: '🌿', angle: -50, dist: 100 },
  { emoji: '💫', angle: -15, dist: 85 },
  { emoji: '⭐', angle:  25, dist: 95 },
  { emoji: '✨', angle:  65, dist: 90 },
  { emoji: '🌿', angle: 110, dist: 100 },
  { emoji: '💫', angle: 155, dist: 85 },
  { emoji: '⭐', angle:-135, dist: 95 },
]

export default function Header() {
  const [burstKey, setBurstKey] = React.useState(0)
  const [bursting, setBursting] = React.useState(false)

  function handleTap() {
    if (bursting) return
    setBursting(true)
    setBurstKey(k => k + 1)
    setTimeout(() => setBursting(false), 750)
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '18px 16px 8px',
      background: 'var(--bg)',
      position: 'relative',
      overflow: 'visible',
    }}>
      {/* Burst particles — remounted on each tap via key */}
      {bursting && PARTICLES.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180
        const tx = Math.round(Math.sin(rad) * p.dist)
        const ty = Math.round(-Math.cos(rad) * p.dist)
        return (
          <div
            key={`${burstKey}-${i}`}
            style={{
              position: 'absolute',
              left: '50%', top: '54%',
              fontSize: '1.3rem',
              pointerEvents: 'none',
              zIndex: 10,
              // CSS custom properties for the keyframe animation
              ['--tx' as string]: `${tx}px`,
              ['--ty' as string]: `${ty}px`,
              animation: `particleBurst .65s cubic-bezier(.2,1,.3,1) ${i * 35}ms forwards`,
              opacity: 0,
            }}
          >
            {p.emoji}
          </div>
        )
      })}

      {/* Logo — floats + glows, tappable */}
      <div
        onClick={handleTap}
        className="logo-float"
        style={{
          cursor: 'pointer',
          animation: 'logoFloat 3.6s ease-in-out infinite, logoGlow 3.6s ease-in-out infinite',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
        }}
      >
        <Image
          src="/logo.png"
          alt="Magic Trip House"
          width={175}
          height={88}
          style={{ objectFit: 'contain', display: 'block' }}
          priority
        />
      </div>
    </div>
  )
}
