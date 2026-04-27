import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPwd, verifyToken } from '@/lib/session'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Admin resets any user's password
export async function POST(req: Request) {
  const nextSession = await auth()
  if (!nextSession) {
    const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!bearer) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const payload = await verifyToken(bearer)
    if (!payload || payload.role !== 'admin')
      return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
  }

  const { handle, newPassword } = await req.json()
  if (!handle || !newPassword || newPassword.length < 6)
    return NextResponse.json({ error: 'Password min. 6 caratteri' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { handle: handle.toLowerCase() } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  await prisma.user.update({
    where: { id: user.id },
    data: { hash: await hashPwd(newPassword) },
  })

  return NextResponse.json({ ok: true })
}
