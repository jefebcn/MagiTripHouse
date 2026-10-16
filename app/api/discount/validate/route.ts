import { NextResponse } from 'next/server'
import { getBearerUser } from '@/lib/session'
import { validateDiscount } from '@/lib/discount'

export const dynamic = 'force-dynamic'

// Verifica un codice sconto per l'utente loggato e l'origine di spedizione
export async function POST(req: Request) {
  const user = await getBearerUser(req)
  if (!user) return NextResponse.json({ ok: false, error: 'Accedi per usare un codice' }, { status: 401 })

  const { code, origin } = await req.json().catch(() => ({}))
  if (typeof origin !== 'string') return NextResponse.json({ ok: false, error: 'Richiesta non valida' }, { status: 400 })

  const res = await validateDiscount(code, origin, user.handle)
  return NextResponse.json(res, { status: res.ok ? 200 : 422 })
}
