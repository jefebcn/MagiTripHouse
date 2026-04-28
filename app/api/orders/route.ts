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
