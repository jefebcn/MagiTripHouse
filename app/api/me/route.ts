import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!bearer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(bearer)
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: payload.id } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [affiliate, channelMember] = await Promise.all([
    prisma.affiliate.findUnique({ where: { username: user.handle } }),
    prisma.channelMember.findUnique({ where: { userId: payload.id } }),
  ])

  let referralCount = 0
  if (affiliate) {
    referralCount = await prisma.affiliate.count({ where: { referredBy: affiliate.code } })
  }

  return NextResponse.json({
    joinedAt: user.createdAt,
    affiliate: affiliate
      ? { code: affiliate.code, referredBy: affiliate.referredBy, referralCount, joinedAt: affiliate.joinedAt }
      : null,
    channelMember: !!channelMember,
  })
}
