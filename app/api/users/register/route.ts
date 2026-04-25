import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPwd, signToken } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { name, handle, password, adminCode } = await req.json()

    if (!name?.trim() || !handle?.trim() || !password)
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })

    const cleanHandle = handle.toLowerCase().trim()
    if (!/^[a-z0-9_]{3,30}$/.test(cleanHandle))
      return NextResponse.json({ error: 'Username non valido (3-30 caratteri, solo lettere/numeri/_)' }, { status: 400 })

    if (password.length < 6)
      return NextResponse.json({ error: 'Password troppo corta (min. 6 caratteri)' }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { handle: cleanHandle } })
    if (existing)
      return NextResponse.json({ error: 'Username già in uso' }, { status: 409 })

    const role = adminCode && adminCode === process.env.ADMIN_SECRET ? 'admin' : 'user'
    const user = await prisma.user.create({
      data: { name: name.trim(), handle: cleanHandle, hash: await hashPwd(password), role },
    })

    const token = await signToken({ id: user.id, handle: user.handle, role: user.role })
    return NextResponse.json({ name: user.name, handle: user.handle, role: user.role, token }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 })
  }
}
