import { randomBytes } from 'node:crypto'
import { prisma } from './prisma'

// Premio per chi acquista sul sito partner (KratosLabs): coupon personale, monouso, con tetto in €
export const PARTNER_REWARD = { percent: 15, maxDiscount: 50, validDays: 30 }

export function normalizePartnerOrder(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toUpperCase().replace(/\s+/g, '').slice(0, 40) : ''
}

export async function createRewardCode(userHandle: string, partnerOrder: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = `KRATOS-${randomBytes(3).toString('hex').toUpperCase()}`
    const exists = await prisma.discountCode.findUnique({ where: { code } })
    if (exists) continue
    await prisma.discountCode.create({
      data: {
        code,
        percent: PARTNER_REWARD.percent,
        maxDiscount: PARTNER_REWARD.maxDiscount,
        maxUses: 1,
        origins: [],
        userHandle,
        expiresAt: new Date(Date.now() + PARTNER_REWARD.validDays * 86_400_000),
        note: `Premio acquisto KratosLabs #${partnerOrder}`,
      },
    })
    return code
  }
  throw new Error('Impossibile generare il codice')
}
