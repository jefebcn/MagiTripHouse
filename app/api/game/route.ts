import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const month = new Date().toISOString().slice(0, 7)
  const all = await prisma.gameScore.findMany({
    where: { month },
    orderBy: { score: 'desc' },
    take: 200,
  })
  const seen = new Set<string>()
  const top = all
    .filter((s) => !seen.has(s.userId) && !!seen.add(s.userId))
    .slice(0, 10)
  return NextResponse.json(top)
}

export async function POST(req: Request) {
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!bearer) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const payload = await verifyToken(bearer)
  if (!payload) return NextResponse.json({ error: 'Token non valido' }, { status: 401 })

  const { score } = await req.json()
  if (typeof score !== 'number' || score < 0 || score > 9999)
    return NextResponse.json({ error: 'Punteggio non valido' }, { status: 400 })

  const month = new Date().toISOString().slice(0, 7)
  const user = await prisma.user.findUnique({ where: { id: payload.id } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  await prisma.gameScore.create({
    data: { userId: payload.id, handle: user.handle, name: user.name, score, month },
  })

  const all = await prisma.gameScore.findMany({
    where: { month },
    orderBy: { score: 'desc' },
    take: 500,
  })
  const seen = new Set<string>()
  const deduped = all.filter((s) => !seen.has(s.userId) && !!seen.add(s.userId))
  const rank = deduped.findIndex((s) => s.userId === payload.id) + 1
  const bestScore = deduped.find((s) => s.userId === payload.id)?.score ?? score

  return NextResponse.json({ ok: true, rank, bestScore })
}
