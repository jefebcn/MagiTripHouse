import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/hooks/useProducts'

type View = 'catalog' | 'news' | 'orders' | 'affiliates' | 'account'

interface UIState {
  view: View
  setView: (v: View) => void
  cartOpen: boolean
  setCartOpen: (v: boolean) => void
  detailProduct: Product | null
  setDetailProduct: (p: Product | null) => void
  lightboxSrc: string
  lightboxType: string
  lightboxCaption: string
  openLightbox: (src: string, type: string, caption: string) => void
  closeLightbox: () => void
  filter: string
  setFilter: (f: string) => void
  search: string
  setSearch: (s: string) => void
  // Auth
  userName: string
  userHandle: string
  isLoggedIn: boolean
  login: (name: string, handle: string) => void
  logout: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      view: 'catalog',
      setView: (view) => set({ view }),
      cartOpen: false,
      setCartOpen: (cartOpen) => set({ cartOpen }),
      detailProduct: null,
      setDetailProduct: (detailProduct) => set({ detailProduct }),
      lightboxSrc: '',
      lightboxType: 'image',
      lightboxCaption: '',
      openLightbox: (lightboxSrc, lightboxType, lightboxCaption) =>
        set({ lightboxSrc, lightboxType, lightboxCaption }),
      closeLightbox: () => set({ lightboxSrc: '', lightboxType: 'image', lightboxCaption: '' }),
      filter: 'all',
      setFilter: (filter) => set({ filter }),
      search: '',
      setSearch: (search) => set({ search }),
      // Auth
      userName: '',
      userHandle: '',
      isLoggedIn: false,
      login: (name, handle) => set({ userName: name, userHandle: handle, isLoggedIn: true }),
      logout: () => set({ userName: '', userHandle: '', isLoggedIn: false, view: 'catalog' }),
    }),
    {
      name: 'tp_ui',
      partialize: (s) => ({ userName: s.userName, userHandle: s.userHandle, isLoggedIn: s.isLoggedIn }),
    }
  )
)
