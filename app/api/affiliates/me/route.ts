import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBearerUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Dati affiliato dell'utente loggato (mai di altri utenti)
export async function GET(req: Request) {
  const user = await getBearerUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const username = user.handle

  const aff = await prisma.affiliate.findUnique({ where: { username } })
  if (!aff) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [referralCount, referralOrders, payouts] = await Promise.all([
    prisma.affiliate.count({ where: { referredBy: aff.code } }),
    prisma.order.findMany({ where: { referredBy: aff.code }, orderBy: { createdAt: 'desc' } }),
    prisma.commissionPayout.findMany({ where: { affiliateCode: aff.code }, orderBy: { requestedAt: 'desc' } }),
  ])

  const referralRevenue = referralOrders.reduce((s, o) => s + o.total, 0)
  const balance = aff.commissionEarned - aff.commissionPaid
  const pendingPayout = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)

  return NextResponse.json({
    ...aff,
    referralCount,
    referralRevenue,
    referralOrders: referralOrders.length,
    balance,
    pendingPayout,
    payouts,
  })
}
