'use client'
import { useEffect, useRef } from 'react'

export function useSwipeToClose(
  panelRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled = true,
) {
  const startY = useRef(0)
  const moved = useRef(0)

  useEffect(() => {
    const el = panelRef.current
    if (!el || !enabled) return

    const handleTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY
      moved.current = 0
    }
    const handleTouchMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - startY.current
      if (dy < 0) return
      moved.current = dy
      el.style.transform = `translateX(-50%) translateY(${dy}px)`
      el.style.opacity = String(1 - dy / 350)
    }
    const handleTouchEnd = () => {
      if (moved.current > 80) {
        onClose()
      }
      el.style.transform = ''
      el.style.opacity = ''
      moved.current = 0
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd)
    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [panelRef, onClose, enabled])
}
