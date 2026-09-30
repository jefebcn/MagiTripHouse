import { prisma } from './prisma'

export type DiscountResult =
  | { ok: true; code: string; percent: number; maxDiscount: number | null; minOrder: number | null }
  | { ok: false; error: string }

// Codice storico: resta valido anche se non è (ancora) stato creato da admin.
// Se l'admin crea un codice con lo stesso nome nel pannello, vale quello del DB.
// Tetto in €: sugli ordini grandi (già scontati a volume) lo sconto non cresce oltre maxDiscount.
type BuiltinRule = { percent: number; firstOrderOnly: boolean; origins: string[]; maxDiscount: number | null; minOrder: number | null; title: string }
const BUILTIN: Record<string, BuiltinRule> = {
  'MAGIC-5':   { percent: 5,  firstOrderOnly: false, origins: [],                maxDiscount: 15, minOrder: null, title: 'Sconto su tutto' },
  SHIP10:      { percent: 10, firstOrderOnly: false, origins: ['spain', 'italy'], maxDiscount: 10, minOrder: 100,  title: 'Spedizione offerta da noi' },
  'MAGIC-10':  { percent: 10, firstOrderOnly: false, origins: [],                maxDiscount: 30, minOrder: 200,  title: 'Per gli ordini grandi' },
  BENVENUTO10: { percent: 10, firstOrderOnly: true,  origins: ['spain', 'italy'], maxDiscount: 10, minOrder: null, title: 'Primo ordine' },
}

export interface PublicDiscount { code: string; title: string | null; percent: number; maxDiscount: number | null; minOrder: number | null; origins: string[]; firstOrderOnly: boolean; expiresAt: Date | null }

// Codici mostrati nella scheda Offerte: integrati (se non ridefiniti da admin) + quelli del DB segnati come visibili
export async function publicDiscounts(): Promise<PublicDiscount[]> {
  const now = new Date()
  const rows = await prisma.discountCode.findMany()
  const list: PublicDiscount[] = []
  for (const [code, r] of Object.entries(BUILTIN)) {
    if (!rows.some(x => x.code === code)) list.push({ code, title: r.title, percent: r.percent, maxDiscount: r.maxDiscount, minOrder: r.minOrder, origins: r.origins, firstOrderOnly: r.firstOrderOnly, expiresAt: null })
  }
  for (const r of rows) {
    if (!r.showInOffers || !r.active || r.userHandle) continue
    if (r.expiresAt && r.expiresAt <= now) continue
    if (r.maxUses != null && r.uses >= r.maxUses) continue
    list.push({ code: r.code, title: BUILTIN[r.code]?.title ?? null, percent: r.percent, maxDiscount: r.maxDiscount, minOrder: r.minOrder, origins: r.origins, firstOrderOnly: r.firstOrderOnly, expiresAt: r.expiresAt })
  }
  return list
}

export { discountAmount } from './discount-math'

export function normalizeCode(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toUpperCase().slice(0, 32) : ''
}

export async function validateDiscount(rawCode: unknown, origin: string, userHandle: string): Promise<DiscountResult> {
  const code = normalizeCode(rawCode)
  if (!code) return { ok: false, error: 'Inserisci un codice' }

  const db = await prisma.discountCode.findUnique({ where: { code } })
  const rule = db
    ? { percent: db.percent, firstOrderOnly: db.firstOrderOnly, origins: db.origins, active: db.active, expiresAt: db.expiresAt, maxUses: db.maxUses, uses: db.uses, maxDiscount: db.maxDiscount, minOrder: db.minOrder }
    : BUILTIN[code]
      ? { percent: BUILTIN[code].percent, firstOrderOnly: BUILTIN[code].firstOrderOnly, origins: BUILTIN[code].origins, maxDiscount: BUILTIN[code].maxDiscount, minOrder: BUILTIN[code].minOrder, active: true, expiresAt: null as Date | null, maxUses: null as number | null, uses: 0 }
      : null

  if (!rule) return { ok: false, error: 'Codice non valido' }
  if (db?.userHandle && db.userHandle.toLowerCase() !== userHandle.toLowerCase()) return { ok: false, error: 'Codice personale di un altro utente' }
  if (!rule.active) return { ok: false, error: 'Codice non più attivo' }
  if (rule.expiresAt && rule.expiresAt.getTime() < Date.now()) return { ok: false, error: 'Codice scaduto' }
  if (rule.maxUses != null && rule.uses >= rule.maxUses) return { ok: false, error: 'Codice esaurito' }
  if (rule.origins.length && !rule.origins.includes(origin)) return { ok: false, error: 'Codice non valido per questa spedizione' }
  if (rule.percent <= 0 || rule.percent > 90) return { ok: false, error: 'Codice non valido' }

  // Ogni codice: una sola volta per cliente
  const alreadyUsed = await prisma.discountRedemption.findUnique({ where: { code_userHandle: { code, userHandle: userHandle.toLowerCase() } } })
  if (alreadyUsed) return { ok: false, error: 'Hai già usato questo codice' }

  if (rule.firstOrderOnly) {
    const prev = await prisma.order.count({ where: { userId: userHandle } })
    if (prev > 0) return { ok: false, error: 'Valido solo per il primo ordine' }
  }

  return { ok: true, code, percent: rule.percent, maxDiscount: rule.maxDiscount ?? null, minOrder: rule.minOrder ?? null }
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

export async function usedCodes(userHandle: string): Promise<string[]> {
  const rows = await prisma.discountRedemption.findMany({ where: { userHandle: userHandle.toLowerCase() }, select: { code: true } })
  return rows.map(r => r.code)
}

// Conta un utilizzo (solo per i codici salvati nel DB)
export async function registerDiscountUse(code: string) {
  await prisma.discountCode.updateMany({ where: { code }, data: { uses: { increment: 1 } } })
}
