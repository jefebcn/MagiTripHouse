import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPwd, signToken } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { handle, password } = await req.json()

    if (!handle?.trim() || !password)
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { handle: handle.toLowerCase().trim() } })
    if (!user)
      return NextResponse.json({ error: 'Username non trovato' }, { status: 401 })

    if (await hashPwd(password) !== user.hash)
      return NextResponse.json({ error: 'Password errata' }, { status: 401 })

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
