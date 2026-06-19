import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payouts = await prisma.commissionPayout.findMany({ orderBy: { requestedAt: 'desc' } })
  return NextResponse.json(payouts)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const payout = await prisma.commissionPayout.update({
    where: { id },
    data: { status, processedAt: status === 'paid' ? new Date() : null },
  })

  // When marking paid, update affiliate's commissionPaid
  if (status === 'paid') {
    await prisma.affiliate.update({
      where: { code: payout.affiliateCode },
      data: { commissionPaid: { increment: payout.amount } },
    })
  }

  return NextResponse.json(payout)
}
