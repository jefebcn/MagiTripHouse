'use client'
import { useEffect, useState } from 'react'

interface TelegramUser {
  id: number
  username?: string
  first_name?: string
  last_name?: string
}

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  initDataUnsafe?: { user?: TelegramUser }
  MainButton: { hide: () => void }
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp }
  }
}

export function useTelegram() {
  const [user, setUser] = useState<string>('')
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      tg.MainButton.hide()
      const tgUser = tg.initDataUnsafe?.user
      if (tgUser) {
        const name = tgUser.username || tgUser.first_name || 'Cliente'
        setUser(name)
        localStorage.setItem('tp_user', name)
      }
    } else {
      const saved = localStorage.getItem('tp_user') ?? ''
      setUser(saved)
    }
    setIsReady(true)
  }, [])

  return { user, isReady }
}
