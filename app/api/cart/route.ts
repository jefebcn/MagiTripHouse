import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Salva/aggiorna lo snapshot del carrello dell'utente (per il recupero carrello abbandonato)
export async function POST(req: Request) {
  const body = await req.json()
  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const items = Array.isArray(body.items) ? body.items : []
  if (!items.length) {
    await prisma.abandonedCart.deleteMany({ where: { userId } })
    return NextResponse.json({ ok: true, cleared: true })
  }

  const total = typeof body.total === 'number' ? body.total : 0
  const now = new Date()
  await prisma.abandonedCart.upsert({
    where: { userId },
    create: { userId, items, total, updatedAt: now, notifiedAt: null },
    update: { items, total, updatedAt: now, notifiedAt: null },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}))
  const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  await prisma.abandonedCart.deleteMany({ where: { userId } })
  return NextResponse.json({ ok: true })
}
