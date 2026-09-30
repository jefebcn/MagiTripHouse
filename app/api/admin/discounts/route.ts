import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { normalizeCode } from '@/lib/discount'

export const dynamic = 'force-dynamic'

const ORIGINS = ['spain', 'italy', 'pharma', 'meetup']

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const codes = await prisma.discountCode.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(codes)
}

// Crea (o aggiorna) un codice
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = await req.json()
  const code = normalizeCode(b.code)
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return NextResponse.json({ error: 'Codice non valido (3-32 caratteri: lettere, numeri, - _)' }, { status: 400 })
  const percent = Number(b.percent)
  if (!Number.isFinite(percent) || percent <= 0 || percent > 90) return NextResponse.json({ error: 'Percentuale tra 1 e 90' }, { status: 400 })

  const origins = Array.isArray(b.origins) ? b.origins.filter((o: unknown) => typeof o === 'string' && ORIGINS.includes(o)) : []
  const expiresAt = b.expiresAt ? new Date(b.expiresAt) : null
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return NextResponse.json({ error: 'Data di scadenza non valida' }, { status: 400 })
  const maxUses = b.maxUses === '' || b.maxUses == null ? null : Math.max(1, Math.floor(Number(b.maxUses)))
  if (maxUses != null && !Number.isFinite(maxUses)) return NextResponse.json({ error: 'Limite utilizzi non valido' }, { status: 400 })

  const data = {
    percent,
    firstOrderOnly: !!b.firstOrderOnly,
    origins,
    active: b.active === undefined ? true : !!b.active,
    expiresAt,
    maxUses,
    note: typeof b.note === 'string' && b.note.trim() ? b.note.trim().slice(0, 200) : null,
  }
  const saved = await prisma.discountCode.upsert({ where: { code }, create: { code, ...data }, update: data })
  return NextResponse.json(saved)
}

// Attiva / disattiva
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { code, active } = await req.json()
  const c = normalizeCode(code)
  if (!c) return NextResponse.json({ error: 'Codice mancante' }, { status: 400 })
  const saved = await prisma.discountCode.update({ where: { code: c }, data: { active: !!active } })
  return NextResponse.json(saved)
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { code } = await req.json()
  const c = normalizeCode(code)
  if (!c) return NextResponse.json({ error: 'Codice mancante' }, { status: 400 })
  await prisma.discountCode.deleteMany({ where: { code: c } })
  return NextResponse.json({ ok: true })
}
