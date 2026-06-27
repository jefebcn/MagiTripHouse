import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Variant } from '@/hooks/useProducts'

export type ShipOrigin = 'spain' | 'italy' | 'pharma' | 'meetup'

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
  shipFrom: ShipOrigin
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
    shipFrom?: ShipOrigin,
  ) => void
  changeQty: (key: string, delta: number) => void
  clear: () => void
  clearOrigin: (o: ShipOrigin) => void
  total: () => number
  itemsByOrigin: (o: ShipOrigin) => CartItem[]
  totalByOrigin: (o: ShipOrigin) => number
  countByOrigin: (o: ShipOrigin) => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem(id, productName, variant, qty, imageUrl, mediaType, emoji = '🌿', shipFrom = 'spain') {
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
              { key, id, productName, variantLabel: variant.label, variantPrice: variant.price, qty, imageUrl, mediaType, emoji, shipFrom },
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
      clearOrigin(o) {
        set((state) => ({ items: state.items.filter((x) => x.shipFrom !== o) }))
      },
      total() {
        return get().items.reduce((s, x) => s + x.variantPrice * x.qty, 0)
      },
      itemsByOrigin(o) {
        return get().items.filter((x) => (x.shipFrom ?? 'spain') === o)
      },
      totalByOrigin(o) {
        return get().items
          .filter((x) => (x.shipFrom ?? 'spain') === o)
          .reduce((s, x) => s + x.variantPrice * x.qty, 0)
      },
      countByOrigin(o) {
        return get().items
          .filter((x) => (x.shipFrom ?? 'spain') === o)
          .reduce((s, x) => s + x.qty, 0)
      },
    }),
    { name: 'tp_cart' },
  ),
)

export const SHIP_META: Record<ShipOrigin, { flag: string; label: string; delivery: string; shipCost: number; color: string }> = {
  spain:  { flag: '🇪🇸', label: 'Spagna',    delivery: '3–6 giorni',      shipCost: 10, color: '#f5c842' },
  italy:  { flag: '🇮🇹', label: 'Italia',    delivery: '2–3 giorni',      shipCost: 10, color: '#3dff6e' },
  pharma: { flag: '💊',  label: 'Pharma EU', delivery: '5–16 gg (UE)',   shipCost: 0,  color: '#818cf8' },
  meetup: { flag: '🤝',  label: 'Solo di persona',   delivery: 'ritiro a mano',  shipCost: 0,  color: '#c084fc' },
}
