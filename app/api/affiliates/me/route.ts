import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username')
  if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 })

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
