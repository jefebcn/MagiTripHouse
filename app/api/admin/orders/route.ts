import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const STATUSES = ['pending', 'paid', 'shipped', 'delivered']

// Registrazione manuale di un ordine dal pannello admin (es. ordine non salvato dall'app, ordine preso in chat)
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const b = await req.json().catch(() => ({}))
  const userId = typeof b.userId === 'string' ? b.userId.trim().replace(/^@/, '').toLowerCase().slice(0, 40) : ''
  if (!userId) return NextResponse.json({ error: 'Indica il cliente (username)' }, { status: 400 })

  const items = Array.isArray(b.items) ? b.items
    .filter((i: { name?: unknown; price?: unknown; qty?: unknown }) => typeof i?.name === 'string' && Number(i.price) >= 0 && Number(i.qty) > 0)
    .map((i: { id?: string; name: string; emoji?: string; label?: string; price: number; qty: number }) => ({
      id: typeof i.id === 'string' ? i.id : undefined, name: i.name.slice(0, 120), emoji: i.emoji ?? '📦',
      label: typeof i.label === 'string' ? i.label.slice(0, 40) : '', price: Number(i.price), qty: Number(i.qty),
    })) : []
  if (!items.length) return NextResponse.json({ error: 'Aggiungi almeno un prodotto' }, { status: 400 })

  const total = Number(b.total)
  if (!Number.isFinite(total) || total < 0) return NextResponse.json({ error: 'Totale non valido' }, { status: 400 })

  const status = STATUSES.includes(b.status) ? b.status : 'pending'
  const createdAt = b.createdAt ? new Date(b.createdAt) : new Date()
  if (Number.isNaN(createdAt.getTime())) return NextResponse.json({ error: 'Data non valida' }, { status: 400 })

  const id = `MTH-${createdAt.getTime()}-M${Math.random().toString(36).slice(2, 4).toUpperCase()}`
  const note = `[Manuale]${typeof b.note === 'string' && b.note.trim() ? ` ${b.note.trim().slice(0, 900)}` : ''}`

  const order = await prisma.order.create({
    data: {
      id, userId, status, total: Math.round(total * 100) / 100, items, note, createdAt,
      // Registrazione manuale: nessuna commissione referral automatica
      commissionCredited: true,
    },
  })
  return NextResponse.json(order, { status: 201 })
}
