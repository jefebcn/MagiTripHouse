import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getBearerUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Richiesta payout: solo per il proprio saldo affiliato
export async function POST(req: Request) {
  const user = await getBearerUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const username = user.handle

  const body = await req.json()
  const amount = Number(body.amount)
  const method = typeof body.method === 'string' ? body.method.slice(0, 20) : undefined
  const note = typeof body.note === 'string' ? body.note.slice(0, 500) : undefined
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Importo non valido' }, { status: 400 })
  if (amount < 20) return NextResponse.json({ error: 'Minimo €20 per richiedere un pagamento' }, { status: 400 })

  const aff = await prisma.affiliate.findUnique({ where: { username } })
  if (!aff) return NextResponse.json({ error: 'Affiliato non trovato' }, { status: 404 })

  const balance = aff.commissionEarned - aff.commissionPaid
  if (amount > balance) return NextResponse.json({ error: 'Saldo insufficiente' }, { status: 400 })

  // Check no pending payout already
  const pending = await prisma.commissionPayout.findFirst({
    where: { affiliateCode: aff.code, status: 'pending' },
  })
  if (pending) return NextResponse.json({ error: 'Hai già una richiesta in attesa' }, { status: 409 })

  const payout = await prisma.commissionPayout.create({
    data: {
      affiliateCode: aff.code,
      username,
      amount,
      method: method ?? 'crypto',
      note: note ?? null,
    },
  })

  return NextResponse.json(payout, { status: 201 })
}
