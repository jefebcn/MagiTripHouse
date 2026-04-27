import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { verifyToken } from '@/lib/session'
import { sendPushToAll } from '@/lib/push'

export const dynamic = 'force-dynamic'

export async function GET() {
  const news = await prisma.newsFeed.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(news)
}

export async function POST(req: Request) {
  // Accept either NextAuth admin session or app Bearer token with role=admin
  const nextSession = await auth()
  if (!nextSession) {
    const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!bearer) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const payload = await verifyToken(bearer)
    if (!payload || payload.role !== 'admin')
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
  }

  const body = await req.json()
  const item = await prisma.newsFeed.create({
    data: {
      title:       body.title,
      content:     body.content,
      emoji:       body.emoji ?? '📢',
      imageUrl:    body.imageUrl ?? null,
      productLink: body.productLink ?? null,
    },
  })

  try {
    await sendPushToAll({
      title: `${item.emoji} ${item.title}`,
      body:  item.content.slice(0, 120),
      url:   '/news',
      emoji: item.emoji,
    })
  } catch { /* push failure doesn't fail news creation */ }

  return NextResponse.json(item, { status: 201 })
}

export async function DELETE(req: Request) {
  const nextSession = await auth()
  if (!nextSession) {
    const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!bearer) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const payload = await verifyToken(bearer)
    if (!payload || payload.role !== 'admin')
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
  }

  const { id } = await req.json()
  await prisma.newsFeed.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
