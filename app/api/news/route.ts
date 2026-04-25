import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { sendPushToAll } from '@/lib/push'

export async function GET() {
  const news = await prisma.newsFeed.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(news)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const item = await prisma.newsFeed.create({
    data: {
      title:       body.title,
      content:     body.content,
      emoji:       body.emoji ?? '📢',
      productLink: body.productLink ?? null,
    },
  })

  // Fire push notification to all subscribers
  try {
    await sendPushToAll({
      title: `${item.emoji} ${item.title}`,
      body:  item.content.slice(0, 120),
      url:   '/news',
      emoji: item.emoji,
    })
  } catch {
    // Push failure shouldn't fail the news creation
  }

  return NextResponse.json(item, { status: 201 })
}
