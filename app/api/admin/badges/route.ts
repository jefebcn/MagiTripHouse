import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Contatori leggeri per i badge del menu admin (cose da fare)
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const staleLimit = new Date(Date.now() - 21 * 86_400_000)
  const [awaitingPayment, toShip, partnerClaims, payouts] = await Promise.all([
    prisma.order.count({ where: { status: 'pending', createdAt: { gte: staleLimit } } }),
    prisma.order.count({ where: { status: 'paid' } }),
    prisma.partnerClaim.count({ where: { status: 'pending' } }),
    prisma.commissionPayout.count({ where: { status: 'pending' } }),
  ])
  return NextResponse.json({ orders: awaitingPayment + toShip, awaitingPayment, toShip, partnerClaims, payouts })
}
