import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/session'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const nextSession = await auth()
  if (!nextSession) {
    const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!bearer) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const payload = await verifyToken(bearer)
    if (!payload || payload.role !== 'admin')
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
  }

  const members = await prisma.channelMember.findMany({ orderBy: { joinedAt: 'desc' } })
  const total = await prisma.user.count()
  return NextResponse.json({ members, total })
}
