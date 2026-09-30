// Calcolo condiviso client/server (niente import di Prisma qui)
export interface DiscountRule { percent: number; maxDiscount: number | null; minOrder: number | null }

// Importo effettivo dello sconto: % sul subtotale, limitato dal tetto in €, zero sotto l'ordine minimo
export function discountAmount(subtotal: number, d: DiscountRule): number {
  if (d.minOrder != null && subtotal < d.minOrder) return 0
  const raw = subtotal * d.percent / 100
  const capped = d.maxDiscount != null ? Math.min(raw, d.maxDiscount) : raw
  return Math.round(capped * 100) / 100
}
