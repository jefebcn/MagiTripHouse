import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/session'
import { hashPassword, safeEqual } from '@/lib/password'
import { LIMITS, clientIp, lockedFor, registerFailure, lockMessage } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { name, handle, password, adminCode } = await req.json()

    // Limite registrazioni per IP (blocca anche i tentativi a raffica sul codice admin)
    const ipKey = `register:ip:${clientIp(req)}`
    const locked = await lockedFor(ipKey)
    if (locked) return NextResponse.json({ error: lockMessage(locked) }, { status: 429 })

    if (typeof name !== 'string' || typeof handle !== 'string' || typeof password !== 'string' || !name.trim() || !handle.trim() || !password)
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

    const cleanHandle = handle.toLowerCase().trim()
    if (!/^[a-z0-9_]{3,30}$/.test(cleanHandle))
      return NextResponse.json({ error: 'Username non valido (3-30 caratteri, solo lettere/numeri/_)' }, { status: 400 })

    if (password.length < 6)
      return NextResponse.json({ error: 'Password troppo corta (min. 6 caratteri)' }, { status: 400 })
    if (password.length > 200)
      return NextResponse.json({ error: 'Password troppo lunga' }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { handle: cleanHandle } })
    if (existing)
      return NextResponse.json({ error: 'Username già in uso' }, { status: 409 })

    const adminSecret = process.env.ADMIN_SECRET
    const wantsAdmin = typeof adminCode === 'string' && adminCode.length > 0
    const role = wantsAdmin && adminSecret && safeEqual(adminCode, adminSecret) ? 'admin' : 'user'
    // Ogni registrazione conta; un codice admin sbagliato ne vale 3 (blocco più rapido)
    await registerFailure(ipKey, LIMITS.register)
    if (wantsAdmin && role !== 'admin') {
      await registerFailure(ipKey, LIMITS.register)
      await registerFailure(ipKey, LIMITS.register)
    }
    const user = await prisma.user.create({
      data: { name: name.trim().slice(0, 60), handle: cleanHandle, hash: await hashPassword(password), role },
    })

    const token = await signToken({ id: user.id, handle: user.handle, role: user.role })
    return NextResponse.json({ name: user.name, handle: user.handle, role: user.role, token }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 })
  }
}
