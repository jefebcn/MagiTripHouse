import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Affitto magazzino: €500/mese, €250 ogni 15 giorni (2 volte al mese) a partire dal 01/08/2026.
const START_YEAR = 2026
const START_MONTH = 7 // Agosto (0-based)
const MONTHLY = 500
const PER_PAYMENT = 250
const DAILY = MONTHLY / 30            // ~16.67 €/giorno
const MAX_VAC_DAYS = Math.floor(PER_PAYMENT / DAILY) // 15 giorni max per rata

// Restituisce il periodo (start/end) della rata numero `seq` (0-based):
// seq pari = 1ª metà del mese (1–15), seq dispari = 2ª metà (16–fine mese).
function periodFor(seq: number) {
  const monthOffset = Math.floor(seq / 2)
  const second = seq % 2 === 1
  const totalMonth = START_MONTH + monthOffset
  const y = START_YEAR + Math.floor(totalMonth / 12)
  const m = totalMonth % 12
  const start = new Date(Date.UTC(y, m, second ? 16 : 1))
  const end = second ? new Date(Date.UTC(y, m + 1, 0)) : new Date(Date.UTC(y, m, 15))
  return { start, end }
}

function round2(n: number) { return Math.round(n * 100) / 100 }

async function computeState() {
  const [payments, vac] = await Promise.all([
    prisma.warehousePayment.findMany({ orderBy: { seq: 'asc' } }),
    prisma.warehouseVacation.findMany({ orderBy: { createdAt: 'desc' } }),
  ])
  const seq = payments.length
  const { start, end } = periodFor(seq)

  const totalVac = vac.reduce((s, v) => s + v.days, 0)
  const usedVac = payments.reduce((s, p) => s + p.vacationDays, 0)
  const pendingVacationDays = Math.max(0, totalVac - usedVac)

  const deductDays = Math.min(pendingVacationDays, MAX_VAC_DAYS)
  const deduction = round2(Math.min(deductDays * DAILY, PER_PAYMENT))
  const total = round2(PER_PAYMENT - deduction)

  const totalPaid = round2(payments.reduce((s, p) => s + p.total, 0))

  return { payments, vac, seq, start, end, pendingVacationDays, deductDays, deduction, total, totalPaid }
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const s = await computeState()
  return NextResponse.json({
    config: { monthly: MONTHLY, perPayment: PER_PAYMENT, daily: round2(DAILY), start: `${String(START_MONTH + 1).padStart(2, '0')}/${START_YEAR}` },
    next: {
      seq: s.seq,
      periodStart: s.start,
      periodEnd: s.end,
      base: PER_PAYMENT,
      pendingVacationDays: s.pendingVacationDays,
      deductDays: s.deductDays,
      deduction: s.deduction,
      total: s.total,
    },
    pendingVacationDays: s.pendingVacationDays,
    totalPaid: s.totalPaid,
    payments: s.payments.map(p => ({
      id: p.id, seq: p.seq, receiptNo: p.receiptNo,
      periodStart: p.periodStart, periodEnd: p.periodEnd,
      base: p.base, vacationDays: p.vacationDays, deduction: p.deduction, total: p.total, paidAt: p.paidAt,
    })),
    vacations: s.vac.map(v => ({ id: v.id, days: v.days, note: v.note, createdAt: v.createdAt })),
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const action = body.action

  if (action === 'vacation') {
    const days = Math.max(1, Math.floor(Number(body.days) || 0))
    if (!days) return NextResponse.json({ error: 'Giorni non validi' }, { status: 400 })
    await prisma.warehouseVacation.create({ data: { days, note: typeof body.note === 'string' ? body.note.trim() || null : null } })
    return NextResponse.json({ ok: true })
  }

  if (action === 'pay') {
    const s = await computeState()
    const receiptNo = `MAG-${String(s.seq + 1).padStart(4, '0')}`
    const payment = await prisma.warehousePayment.create({
      data: {
        seq: s.seq,
        periodStart: s.start,
        periodEnd: s.end,
        base: PER_PAYMENT,
        vacationDays: s.deductDays,
        deduction: s.deduction,
        total: s.total,
        receiptNo,
      },
    })
    return NextResponse.json({ ok: true, payment })
  }

  if (action === 'undo') {
    // Annulla l'ultimo pagamento registrato
    const last = await prisma.warehousePayment.findFirst({ orderBy: { seq: 'desc' } })
    if (last) await prisma.warehousePayment.delete({ where: { id: last.id } })
    return NextResponse.json({ ok: true })
  }

  if (action === 'deleteVacation') {
    if (typeof body.id === 'string') await prisma.warehouseVacation.deleteMany({ where: { id: body.id } })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
}
