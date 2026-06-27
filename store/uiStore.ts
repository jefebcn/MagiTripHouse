import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/hooks/useProducts'
import type { ShipOrigin } from '@/store/cartStore'

type View = 'hub' | 'catalog' | 'news' | 'orders' | 'affiliates' | 'account' | 'game' | 'request' | 'faq'
export type { ShipOrigin }

interface UIState {
  view: View
  setView: (v: View) => void
  shipFilter: ShipOrigin | null
  setShipFilter: (s: ShipOrigin | null) => void
  goToCatalog: (opts?: { ship?: ShipOrigin | null; category?: string; search?: string }) => void
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
  userRole: string
  userAvatar: string
  sessionToken: string
  isLoggedIn: boolean
  login: (name: string, handle: string, role: string, token: string) => void
  logout: () => void
  setUserAvatar: (url: string) => void
  // Channel
  channelJoined: boolean
  setChannelJoined: (v: boolean) => void
  // News badge
  lastReadNewsAt: string
  setLastReadNewsAt: (t: string) => void
  latestNewsAt: string
  setLatestNewsAt: (t: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      view: 'hub',
      setView: (view) => set({ view }),
      shipFilter: null,
      setShipFilter: (shipFilter) => set({ shipFilter }),
      goToCatalog: (opts) => set({
        view: 'catalog',
        shipFilter: opts?.ship !== undefined ? opts.ship : null,
        filter: opts?.category ?? 'all',
        search: opts?.search ?? '',
      }),
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
      userRole: '',
      userAvatar: '',
      sessionToken: '',
      isLoggedIn: false,
      login: (name, handle, role, token) =>
        set({ userName: name, userHandle: handle, userRole: role, sessionToken: token, isLoggedIn: true }),
      logout: () =>
        set({ userName: '', userHandle: '', userRole: '', userAvatar: '', sessionToken: '', isLoggedIn: false, view: 'catalog' }),
      setUserAvatar: (userAvatar) => set({ userAvatar }),
      // Channel
      channelJoined: false,
      setChannelJoined: (channelJoined) => set({ channelJoined }),
      // News badge
      lastReadNewsAt: '',
      setLastReadNewsAt: (lastReadNewsAt) => set({ lastReadNewsAt }),
      latestNewsAt: '',
      setLatestNewsAt: (latestNewsAt) => set({ latestNewsAt }),
    }),
    {
      name: 'tp_ui',
      partialize: (s) => ({
        userName: s.userName,
        userHandle: s.userHandle,
        userRole: s.userRole,
        userAvatar: s.userAvatar,
        sessionToken: s.sessionToken,
        isLoggedIn: s.isLoggedIn,
        channelJoined: s.channelJoined,
        lastReadNewsAt: s.lastReadNewsAt,
      }),
    }
  )
)
