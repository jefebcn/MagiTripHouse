import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBearerUser } from '@/lib/session'

// Ordini dell'utente loggato — l'identità viene dal token, non dalla query
export async function GET(req: Request) {
  const user = await getBearerUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const orders = await prisma.order.findMany({
    // Case-insensitive: gli ordini storici potevano avere lo username con maiuscole diverse
    where: { userId: { equals: user.handle, mode: 'insensitive' } },
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
