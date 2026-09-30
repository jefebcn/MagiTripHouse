import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { notifyAdminOrder } from '@/lib/telegram'
import { sendPushToUser } from '@/lib/push'
import { getBearerUser } from '@/lib/session'
import { validateDiscount, registerDiscountUse, redeemDiscount } from '@/lib/discount'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(orders)
}

export async function POST(req: Request) {
  // Solo utenti loggati: l'identità viene dal token, mai dal body
  const user = await getBearerUser(req)
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await req.json()
  const items = Array.isArray(body.items) ? body.items : []
  const total = Number(body.total)
  if (typeof body.id !== 'string' || !body.id.trim() || !items.length || !Number.isFinite(total) || total < 0) {
    return NextResponse.json({ error: 'Ordine non valido' }, { status: 400 })
  }

  // Idempotente: un reinvio dello stesso ordine (coda del telefono) non crea doppioni
  const existing = await prisma.order.findUnique({ where: { id: body.id.trim().slice(0, 64) } })
  if (existing) {
    if (existing.userId.toLowerCase() !== user.handle.toLowerCase()) return NextResponse.json({ error: 'Ordine non valido' }, { status: 409 })
    return NextResponse.json(existing, { status: 200 })
  }

  // Ri-valida il codice sconto lato server (prima di creare l'ordine: il check "primo ordine" conta gli ordini esistenti).
  // Se non è valido l'ordine passa comunque, ma viene segnalato nella nota così l'admin corregge il totale.
  let note = typeof body.note === 'string' ? body.note.slice(0, 1000) : null
  let validCode: string | null = null
  if (typeof body.discountCode === 'string' && body.discountCode.trim()) {
    const d = await validateDiscount(body.discountCode, typeof body.origin === 'string' ? body.origin : '', user.handle)
    if (d.ok) validCode = d.code
    else note = `⚠️ CODICE SCONTO NON VALIDO (${body.discountCode.slice(0, 32)}: ${d.error}) ${note ?? ''}`.trim()
  }
  // Blocca il codice per questo cliente (vincolo unico: regge anche due ordini inviati insieme)
  const orderId = body.id.trim().slice(0, 64)
  if (validCode && !(await redeemDiscount(validCode, user.handle, orderId))) {
    note = `⚠️ CODICE SCONTO GIÀ USATO (${validCode}) ${note ?? ''}`.trim()
    validCode = null
  }

  const order = await prisma.order.create({
    data: {
      id:         orderId,
      userId:     user.handle,
      status:     'pending',
      total,
      items,
      note,
      referredBy: typeof body.referredBy === 'string' ? body.referredBy.slice(0, 32) : null,
      commissionCredited: false,
    },
  }).catch(async (e) => {
    // Ordine non creato: il codice torna disponibile per il cliente
    if (validCode) await prisma.discountRedemption.deleteMany({ where: { code: validCode, userHandle: user.handle.toLowerCase() } }).catch(() => {})
    throw e
  })

  // Scala il credito affiliato dell'utente stesso (mai di un altro)
  const creditReq = Number(body.affiliateCredit)
  if (Number.isFinite(creditReq) && creditReq > 0) {
    prisma.affiliate.findUnique({ where: { username: user.handle } }).then(async aff => {
      if (!aff) return
      const available = aff.commissionEarned - aff.commissionPaid
      const credit = Math.min(creditReq, available)
      if (credit > 0) {
        await prisma.affiliate.update({
          where: { username: user.handle },
          data: { commissionPaid: { increment: credit } },
        })
      }
    }).catch(() => {})
  }

  if (validCode) registerDiscountUse(validCode).catch(() => {})

  // La commissione referral NON viene accreditata qui: solo quando l'admin conferma l'ordine (PATCH)

  notifyAdminOrder(order).catch(() => {})
  return NextResponse.json(order, { status: 201 })
}

// Stati che confermano un ordine come reale/pagato → sbloccano la commissione referral
const CONFIRMED_STATUSES = ['paid', 'shipped', 'delivered']

async function creditReferralCommission(orderId: string) {
  // Claim atomico: evita doppi accrediti se lo stato cambia più volte
  const claim = await prisma.order.updateMany({
    where: { id: orderId, commissionCredited: false, referredBy: { not: null } },
    data: { commissionCredited: true },
  })
  if (claim.count !== 1) return

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order?.referredBy) return

  const aff = await prisma.affiliate.findUnique({ where: { code: order.referredBy } })
  if (!aff) return
  // Niente auto-referral: chi compra non può incassare commissione sul proprio ordine
  if (aff.username === order.userId) return

  const refCount = await prisma.affiliate.count({ where: { referredBy: aff.code } })
  const newTier = refCount >= 15 ? 'gold' : refCount >= 5 ? 'silver' : 'bronze'
  const newRate = newTier === 'gold' ? 0.12 : newTier === 'silver' ? 0.08 : 0.05
  await prisma.affiliate.update({
    where: { code: aff.code },
    data: { commissionEarned: { increment: order.total * newRate }, tier: newTier, commissionRate: newRate },
  })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status, tracking } = await req.json()

  const prev = await prisma.order.findUnique({ where: { id } })
  const data: { status?: string; tracking?: string | null } = {}
  if (typeof status === 'string') data.status = status
  if (tracking !== undefined) data.tracking = tracking || null

  const order = await prisma.order.update({ where: { id }, data })

  // Ordine confermato dall'admin → accredita la commissione referral (una sola volta)
  if (typeof status === 'string' && CONFIRMED_STATUSES.includes(status)) {
    await creditReferralCommission(id).catch(() => {})
  }

  // Notifica push al cliente quando l'ordine passa a "spedito"
  if (prev && order.userId && status === 'shipped' && prev.status !== 'shipped') {
    sendPushToUser(order.userId, {
      title: '📦 Ordine spedito!',
      body: order.tracking
        ? `Il tuo ordine ${order.id} è partito · Tracking: ${order.tracking}`
        : `Il tuo ordine ${order.id} è stato spedito 🚚`,
      url: '/',
      emoji: '📦',
    }).catch(() => {})
  }

  return NextResponse.json(order)
}
