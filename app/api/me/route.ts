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
    avatarUrl: user.avatarUrl ?? null,
    affiliate: affiliate
      ? { code: affiliate.code, referredBy: affiliate.referredBy, referralCount, joinedAt: affiliate.joinedAt }
      : null,
    channelMember: !!channelMember,
  })
}

// Update profile (avatarUrl, name)
export async function PATCH(req: Request) {
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!bearer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await verifyToken(bearer)
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const body = await req.json()
  const data: { avatarUrl?: string; name?: string } = {}
  if (typeof body.avatarUrl === 'string') data.avatarUrl = body.avatarUrl
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()

  if (!Object.keys(data).length)
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const user = await prisma.user.update({ where: { id: payload.id }, data })
  return NextResponse.json({ ok: true, avatarUrl: user.avatarUrl ?? null, name: user.name })
}
