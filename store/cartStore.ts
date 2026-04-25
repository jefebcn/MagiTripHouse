import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Variant } from '@/hooks/useProducts'

export interface CartItem {
  key: string
  id: string
  productName: string
  variantLabel: string
  variantPrice: number
  qty: number
  imageUrl?: string | null
  mediaType?: string | null
  emoji: string
}

interface CartState {
  items: CartItem[]
  addItem: (
    id: string,
    productName: string,
    variant: Variant,
    qty: number,
    imageUrl?: string | null,
    mediaType?: string | null,
    emoji?: string,
  ) => void
  changeQty: (key: string, delta: number) => void
  clear: () => void
  total: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem(id, productName, variant, qty, imageUrl, mediaType, emoji = '🌿') {
        const key = `${id}_${variant.label}`
        set((state) => {
          const existing = state.items.find((x) => x.key === key)
          if (existing) {
            return {
              items: state.items.map((x) =>
                x.key === key ? { ...x, qty: x.qty + qty } : x,
              ),
            }
          }
          return {
            items: [
              ...state.items,
              { key, id, productName, variantLabel: variant.label, variantPrice: variant.price, qty, imageUrl, mediaType, emoji },
            ],
          }
        })
      },
      changeQty(key, delta) {
        set((state) => {
          const items = state.items
            .map((x) => (x.key === key ? { ...x, qty: x.qty + delta } : x))
            .filter((x) => x.qty > 0)
          return { items }
        })
      },
      clear() { set({ items: [] }) },
      total() {
        return get().items.reduce((s, x) => s + x.variantPrice * x.qty, 0)
      },
    }),
    { name: 'tp_cart' },
  ),
)
