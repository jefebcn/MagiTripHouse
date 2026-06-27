import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Ordini del singolo cliente — filtrati per userId (handle Telegram)
export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get('userId')?.trim()
  if (!userId) return NextResponse.json([])

  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      tracking: true,
      total: true,
      items: true,
      note: true,
      createdAt: true,
    },
  })
  return NextResponse.json(orders)
}
