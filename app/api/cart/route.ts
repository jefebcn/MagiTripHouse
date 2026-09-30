import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBearerUser } from '@/lib/session'

// Salva/aggiorna lo snapshot del carrello dell'utente loggato (recupero carrello abbandonato)
export async function POST(req: Request) {
  const user = await getBearerUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const userId = user.handle

  const body = await req.json()
  const items = Array.isArray(body.items) ? body.items.slice(0, 100) : []
  if (!items.length) {
    await prisma.abandonedCart.deleteMany({ where: { userId } })
    return NextResponse.json({ ok: true, cleared: true })
  }

  const total = typeof body.total === 'number' && Number.isFinite(body.total) ? body.total : 0
  const now = new Date()
  await prisma.abandonedCart.upsert({
    where: { userId },
    create: { userId, items, total, updatedAt: now, notifiedAt: null },
    update: { items, total, updatedAt: now, notifiedAt: null },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const user = await getBearerUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  await prisma.abandonedCart.deleteMany({ where: { userId: user.handle } })
  return NextResponse.json({ ok: true })
}
