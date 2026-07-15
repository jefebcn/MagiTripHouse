import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPushToUser } from '@/lib/push'

export const dynamic = 'force-dynamic'

// Invia una push agli utenti con carrello inattivo (recupero carrello abbandonato).
// Schedulato via Vercel Cron (vedi vercel.json). Protetto da CRON_SECRET se impostato.
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = Date.now()
  const idleCutoff = new Date(now - 60 * 60 * 1000)       // inattivo da almeno 1 ora
  const maxAge = new Date(now - 7 * 24 * 60 * 60 * 1000)  // ma non più vecchio di 7 giorni

  const carts = await prisma.abandonedCart.findMany({
    where: { updatedAt: { lt: idleCutoff, gt: maxAge } },
  })

  let sent = 0
  for (const c of carts) {
    const items = Array.isArray(c.items) ? c.items as { name?: string; qty?: number }[] : []
    if (!items.length) continue
    // Già avvisato dopo l'ultimo aggiornamento del carrello → salta
    if (c.notifiedAt && c.notifiedAt >= c.updatedAt) continue

    const count = items.reduce((s, x) => s + (x.qty ?? 1), 0)
    const first = items[0]?.name ?? 'i tuoi prodotti'
    const body = items.length === 1
      ? `Hai lasciato ${first} nel carrello 👀 Completa l'ordine!`
      : `Hai ${count} articoli nel carrello 👀 Completa l'ordine!`

    const res = await sendPushToUser(c.userId, {
      title: '🛒 Il tuo carrello ti aspetta',
      body,
      url: '/',
      emoji: '🛒',
    })
    if (res.sent > 0) {
      await prisma.abandonedCart.update({ where: { userId: c.userId }, data: { notifiedAt: new Date() } })
      sent++
    }
  }

  return NextResponse.json({ checked: carts.length, sent })
}

export async function GET(req: Request)  { return handle(req) }
export async function POST(req: Request) { return handle(req) }
