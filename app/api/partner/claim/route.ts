import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBearerUser } from '@/lib/session'
import { PARTNER_REWARD, normalizePartnerOrder } from '@/lib/partner'

export const dynamic = 'force-dynamic'

// Stato del premio partner per l'utente loggato
export async function GET(req: Request) {
  const user = await getBearerUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const claim = await prisma.partnerClaim.findFirst({ where: { userHandle: user.handle }, orderBy: { createdAt: 'desc' } })
  let used = false
  if (claim?.code) {
    const dc = await prisma.discountCode.findUnique({ where: { code: claim.code } })
    used = !!dc && dc.maxUses != null && dc.uses >= dc.maxUses
  }
  return NextResponse.json({ reward: PARTNER_REWARD, claim: claim ? { status: claim.status, partnerOrder: claim.partnerOrder, code: claim.code, used, createdAt: claim.createdAt } : null })
}

// Invia il numero d'ordine KratosLabs da verificare (un premio per utente)
export async function POST(req: Request) {
  const user = await getBearerUser(req)
  if (!user) return NextResponse.json({ error: 'Accedi per richiedere il premio' }, { status: 401 })

  const { partnerOrder, note } = await req.json().catch(() => ({}))
  const order = normalizePartnerOrder(partnerOrder)
  if (order.length < 3) return NextResponse.json({ error: 'Inserisci il numero d’ordine KratosLabs' }, { status: 400 })

  const open = await prisma.partnerClaim.findFirst({ where: { userHandle: user.handle, status: { in: ['pending', 'approved'] } } })
  if (open?.status === 'approved') return NextResponse.json({ error: 'Hai già ricevuto il premio partner' }, { status: 409 })
  if (open?.status === 'pending') return NextResponse.json({ error: 'Hai già una richiesta in verifica' }, { status: 409 })

  const dup = await prisma.partnerClaim.findUnique({ where: { partnerOrder: order } })
  if (dup) return NextResponse.json({ error: 'Questo ordine è già stato usato per un premio' }, { status: 409 })

  const claim = await prisma.partnerClaim.create({
    data: { userHandle: user.handle, partnerOrder: order, note: typeof note === 'string' && note.trim() ? note.trim().slice(0, 200) : null },
  })
  return NextResponse.json({ ok: true, status: claim.status }, { status: 201 })
}
