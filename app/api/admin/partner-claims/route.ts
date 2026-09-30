import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createRewardCode } from '@/lib/partner'
import { sendPushToUser } from '@/lib/push'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const claims = await prisma.partnerClaim.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
  return NextResponse.json(claims)
}

// Approva (genera il coupon personale) o rifiuta una richiesta
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, action } = await req.json().catch(() => ({}))
  if (typeof id !== 'string' || (action !== 'approve' && action !== 'reject'))
    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 })

  // Claim atomico: evita doppia approvazione (e doppio coupon)
  const claimed = await prisma.partnerClaim.updateMany({
    where: { id, status: 'pending' },
    data: { status: action === 'approve' ? 'approved' : 'rejected', processedAt: new Date() },
  })
  if (claimed.count !== 1) return NextResponse.json({ error: 'Richiesta già gestita' }, { status: 409 })

  const claim = await prisma.partnerClaim.findUnique({ where: { id } })
  if (!claim) return NextResponse.json({ error: 'Non trovata' }, { status: 404 })

  if (action === 'approve') {
    try {
      const code = await createRewardCode(claim.userHandle, claim.partnerOrder)
      const saved = await prisma.partnerClaim.update({ where: { id }, data: { code } })
      sendPushToUser(claim.userHandle, {
        title: '🎁 Premio partner sbloccato!',
        body: `Il tuo coupon ${code} è pronto: aprilo nell'app e usalo nel carrello`,
        url: '/', emoji: '🎁',
      }).catch(() => {})
      return NextResponse.json(saved)
    } catch {
      await prisma.partnerClaim.update({ where: { id }, data: { status: 'pending', processedAt: null } })
      return NextResponse.json({ error: 'Errore nella generazione del coupon, riprova' }, { status: 500 })
    }
  }
  return NextResponse.json(claim)
}
