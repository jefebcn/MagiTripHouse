import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { username, amount, method, note } = await req.json()
  if (!username || !amount) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
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
