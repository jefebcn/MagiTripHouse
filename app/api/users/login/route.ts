import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/session'
import { verifyPassword, needsRehash, hashPassword, burnPasswordCheck } from '@/lib/password'
import { LIMITS, clientIp, lockedFor, registerFailure, clearFailures, lockMessage } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Messaggio unico: non rivela se lo username esiste
const BAD_CREDENTIALS = 'Username o password errati'

export async function POST(req: Request) {
  try {
    const { handle, password } = await req.json()

    if (typeof handle !== 'string' || !handle.trim() || typeof password !== 'string' || !password)
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

    const cleanHandle = handle.toLowerCase().trim().slice(0, 64)
    const userKey = `login:u:${cleanHandle}`
    const ipKey = `login:ip:${clientIp(req)}`

    const locked = Math.max(await lockedFor(userKey), await lockedFor(ipKey))
    if (locked) return NextResponse.json({ error: lockMessage(locked) }, { status: 429 })

    const user = await prisma.user.findUnique({ where: { handle: cleanHandle } })
    const ok = user ? await verifyPassword(password, user.hash) : (await burnPasswordCheck(password), false)

    if (!user || !ok) {
      await Promise.all([registerFailure(userKey, LIMITS.loginUser), registerFailure(ipKey, LIMITS.loginIp)])
      const nowLocked = await lockedFor(userKey)
      if (nowLocked) return NextResponse.json({ error: lockMessage(nowLocked) }, { status: 429 })
      return NextResponse.json({ error: BAD_CREDENTIALS }, { status: 401 })
    }

    await clearFailures(userKey)

    // Migrazione trasparente dei vecchi hash SHA-256 → scrypt
    if (needsRehash(user.hash)) {
      hashPassword(password)
        .then(hash => prisma.user.update({ where: { id: user.id }, data: { hash } }))
        .catch(() => {})
    }

    const token = await signToken({ id: user.id, handle: user.handle, role: user.role })

    // Track login — fire and forget, don't block the response
    prisma.userActivity.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: { loginCount: { increment: 1 }, lastSeen: new Date() },
    }).catch(() => {})

    return NextResponse.json({ name: user.name, handle: user.handle, role: user.role, token, avatarUrl: user.avatarUrl ?? null })
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 })
  }
}
