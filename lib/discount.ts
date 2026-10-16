import { prisma } from './prisma'
import { PARTNER_CODE_PREFIX } from './partner'

export type DiscountResult =
  | { ok: true; code: string; percent: number; maxDiscount: number | null; minOrder: number | null }
  | { ok: false; error: string }

export { discountAmount } from './discount-math'

export function normalizeCode(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toUpperCase().slice(0, 32) : ''
}

// L'unico sconto attivo è il premio KratosLabs: coupon personale (KRATOS-…) generato dall'admin dopo la verifica.
// Qualsiasi altro codice (vecchi codici pubblici, benvenuto, ecc.) non è più valido.
export async function validateDiscount(rawCode: unknown, origin: string, userHandle: string): Promise<DiscountResult> {
  const code = normalizeCode(rawCode)
  if (!code) return { ok: false, error: 'Inserisci un codice' }
  if (!code.startsWith(PARTNER_CODE_PREFIX)) return { ok: false, error: 'Codice non valido: lo sconto è riservato a chi acquista su KratosLabs' }

  const db = await prisma.discountCode.findUnique({ where: { code } })
  if (!db || !db.userHandle) return { ok: false, error: 'Codice non valido' }
  if (db.userHandle.toLowerCase() !== userHandle.toLowerCase()) return { ok: false, error: 'Codice personale di un altro utente' }
  if (!db.active) return { ok: false, error: 'Codice non più attivo' }
  if (db.expiresAt && db.expiresAt.getTime() < Date.now()) return { ok: false, error: 'Codice scaduto' }
  if (db.maxUses != null && db.uses >= db.maxUses) return { ok: false, error: 'Codice esaurito' }
  if (db.origins.length && !db.origins.includes(origin)) return { ok: false, error: 'Codice non valido per questa spedizione' }
  if (db.percent <= 0 || db.percent > 90) return { ok: false, error: 'Codice non valido' }

  // Ogni codice: una sola volta per cliente
  const alreadyUsed = await prisma.discountRedemption.findUnique({ where: { code_userHandle: { code, userHandle: userHandle.toLowerCase() } } })
  if (alreadyUsed) return { ok: false, error: 'Hai già usato questo codice' }

  return { ok: true, code, percent: db.percent, maxDiscount: db.maxDiscount ?? null, minOrder: db.minOrder ?? null }
}

// Registra l'uso del codice da parte del cliente. false = già usato (anche in caso di due ordini in contemporanea)
export async function redeemDiscount(code: string, userHandle: string, orderId: string): Promise<boolean> {
  try {
    await prisma.discountRedemption.create({ data: { code, userHandle: userHandle.toLowerCase(), orderId } })
    return true
  } catch {
    return false
  }
}

// Conta un utilizzo
export async function registerDiscountUse(code: string) {
  await prisma.discountCode.updateMany({ where: { code }, data: { uses: { increment: 1 } } })
}
