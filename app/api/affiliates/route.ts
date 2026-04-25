import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

function generateAffCode(username: string): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) >>> 0
  }
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += charset[hash % charset.length]
    hash = (hash * 1664525 + 1013904223) >>> 0
  }
  return code
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const affiliates = await prisma.affiliate.findMany({ orderBy: { joinedAt: 'desc' } })
  return NextResponse.json(affiliates)
}

export async function POST(req: Request) {
  const { username } = await req.json()
  if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 })

  const existing = await prisma.affiliate.findUnique({ where: { username } })
  if (existing) return NextResponse.json(existing)

  const code = generateAffCode(username)
  const affiliate = await prisma.affiliate.create({
    data: { username, code },
  })
  return NextResponse.json(affiliate, { status: 201 })
}

export async function PATCH(req: Request) {
  const { username, referrerCode } = await req.json()
  if (!username || !referrerCode) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const me = await prisma.affiliate.findUnique({ where: { username } })
  if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (me.referredBy) return NextResponse.json({ error: 'Already has referrer' }, { status: 409 })
  if (me.code === referrerCode) return NextResponse.json({ error: 'Cannot use own code' }, { status: 400 })

  const referrer = await prisma.affiliate.findUnique({ where: { code: referrerCode } })
  if (!referrer) return NextResponse.json({ error: 'Code not found' }, { status: 404 })
  if (referrer.referredBy === me.code) return NextResponse.json({ error: 'Circular reference' }, { status: 400 })

  const updated = await prisma.affiliate.update({
    where: { username },
    data: { referredBy: referrerCode, referredAt: new Date() },
  })
  return NextResponse.json(updated)
}
