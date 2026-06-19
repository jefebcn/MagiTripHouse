import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { notifyAdminOrder } from '@/lib/telegram'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(orders)
}

export async function POST(req: Request) {
  const body = await req.json()
  const order = await prisma.order.create({
    data: {
      id:         body.id,
      userId:     body.userId,
      status:     'pending',
      total:      body.total,
      items:      body.items,
      note:       body.note ?? null,
      referredBy: body.referredBy ?? null,
    },
  })

  // Deduct affiliate store credit if applied
  if (body.affiliateCredit > 0 && body.affiliateUsername) {
    prisma.affiliate.findUnique({ where: { username: body.affiliateUsername } }).then(async aff => {
      if (!aff) return
      const available = aff.commissionEarned - aff.commissionPaid
      const credit = Math.min(body.affiliateCredit, available)
      if (credit > 0) {
        await prisma.affiliate.update({
          where: { username: body.affiliateUsername },
          data: { commissionPaid: { increment: credit } },
        })
      }
    }).catch(() => {})
  }

  // Credit commission to affiliate if order has referral code
  if (order.referredBy) {
    prisma.affiliate.findUnique({ where: { code: order.referredBy } }).then(async aff => {
      if (!aff) return
      const refCount = await prisma.affiliate.count({ where: { referredBy: aff.code } })
      const newTier = refCount >= 15 ? 'gold' : refCount >= 5 ? 'silver' : 'bronze'
      const newRate = newTier === 'gold' ? 0.12 : newTier === 'silver' ? 0.08 : 0.05
      const commission = order.total * newRate
      await prisma.affiliate.update({
        where: { code: order.referredBy! },
        data: { commissionEarned: { increment: commission }, tier: newTier, commissionRate: newRate },
      })
    }).catch(() => {})
  }

  notifyAdminOrder(order).catch(() => {})
  return NextResponse.json(order, { status: 201 })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await req.json()
  const order = await prisma.order.update({ where: { id }, data: { status } })
  return NextResponse.json(order)
}
