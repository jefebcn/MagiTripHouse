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

  const [users, channelMembers, activities] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.channelMember.findMany(),
    prisma.userActivity.findMany(),
  ])

  const channelSet = new Set(channelMembers.map(m => m.userId))
  const activityMap = new Map(activities.map(a => [a.userId, a]))

  const result = users.map(u => ({
    id: u.id,
    name: u.name,
    handle: u.handle,
    role: u.role,
    avatarUrl: u.avatarUrl ?? null,
    createdAt: u.createdAt,
    inChannel: channelSet.has(u.id),
    activity: activityMap.has(u.id) ? {
      lastSeen: activityMap.get(u.id)!.lastSeen,
      loginCount: activityMap.get(u.id)!.loginCount,
      totalMinutes: activityMap.get(u.id)!.totalMinutes,
    } : null,
  }))

  const channelCount = channelMembers.length
  return NextResponse.json({ users: result, channelCount, total: users.length })
}
