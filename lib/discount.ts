import { prisma } from './prisma'

export type DiscountResult =
  | { ok: true; code: string; percent: number }
  | { ok: false; error: string }

// Codice storico: resta valido anche se non è (ancora) stato creato da admin.
// Se l'admin crea un codice con lo stesso nome nel pannello, vale quello del DB.
const BUILTIN: Record<string, { percent: number; firstOrderOnly: boolean; origins: string[] }> = {
  BENVENUTO10: { percent: 10, firstOrderOnly: true, origins: ['spain', 'italy'] },
}

export function normalizeCode(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toUpperCase().slice(0, 32) : ''
}

export async function validateDiscount(rawCode: unknown, origin: string, userHandle: string): Promise<DiscountResult> {
  const code = normalizeCode(rawCode)
  if (!code) return { ok: false, error: 'Inserisci un codice' }

  const db = await prisma.discountCode.findUnique({ where: { code } })
  const rule = db
    ? { percent: db.percent, firstOrderOnly: db.firstOrderOnly, origins: db.origins, active: db.active, expiresAt: db.expiresAt, maxUses: db.maxUses, uses: db.uses }
    : BUILTIN[code]
      ? { ...BUILTIN[code], active: true, expiresAt: null as Date | null, maxUses: null as number | null, uses: 0 }
      : null

  if (!rule) return { ok: false, error: 'Codice non valido' }
  if (!rule.active) return { ok: false, error: 'Codice non più attivo' }
  if (rule.expiresAt && rule.expiresAt.getTime() < Date.now()) return { ok: false, error: 'Codice scaduto' }
  if (rule.maxUses != null && rule.uses >= rule.maxUses) return { ok: false, error: 'Codice esaurito' }
  if (rule.origins.length && !rule.origins.includes(origin)) return { ok: false, error: 'Codice non valido per questa spedizione' }
  if (rule.percent <= 0 || rule.percent > 90) return { ok: false, error: 'Codice non valido' }

  if (rule.firstOrderOnly) {
    const prev = await prisma.order.count({ where: { userId: userHandle } })
    if (prev > 0) return { ok: false, error: 'Valido solo per il primo ordine' }
  }

  return { ok: true, code, percent: rule.percent }
}

// Codici da mostrare nella scheda Offerte (solo quelli attivi e segnati come pubblici)
export async function publicDiscounts() {
  const now = new Date()
  const rows = await prisma.discountCode.findMany({
    where: { active: true, showInOffers: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: { percent: 'desc' },
  })
  const list = rows
    .filter(r => r.maxUses == null || r.uses < r.maxUses)
    .map(r => ({ code: r.code, percent: r.percent, firstOrderOnly: r.firstOrderOnly, origins: r.origins, expiresAt: r.expiresAt }))
  // Il codice di benvenuto integrato resta visibile finché non viene ridefinito da admin
  const overridden = await prisma.discountCode.findMany({ where: { code: { in: Object.keys(BUILTIN) } }, select: { code: true } })
  for (const [code, rule] of Object.entries(BUILTIN)) {
    if (!overridden.some(o => o.code === code)) list.push({ code, ...rule, expiresAt: null })
  }
  return list
}

// Conta un utilizzo (solo per i codici salvati nel DB)
export async function registerDiscountUse(code: string) {
  await prisma.discountCode.updateMany({ where: { code }, data: { uses: { increment: 1 } } })
}
