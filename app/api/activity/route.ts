import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Heartbeat — called every 60s from the client while the app is open
export async function PATCH(req: Request) {
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!bearer) return NextResponse.json({ ok: false })
  const payload = await verifyToken(bearer)
  if (!payload) return NextResponse.json({ ok: false })

  await prisma.userActivity.upsert({
    where: { userId: payload.id },
    create: { userId: payload.id },
    update: { lastSeen: new Date(), totalMinutes: { increment: 1 } },
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
