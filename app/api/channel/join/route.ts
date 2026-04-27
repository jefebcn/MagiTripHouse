import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!bearer) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const payload = await verifyToken(bearer)
  if (!payload) return NextResponse.json({ error: 'Token non valido' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: payload.id } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  await prisma.channelMember.upsert({
    where: { userId: payload.id },
    create: { userId: payload.id, handle: user.handle, name: user.name },
    update: {},
  })

  return NextResponse.json({ ok: true })
}
