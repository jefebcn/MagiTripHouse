import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPwd, verifyToken } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Self-service password change — requires current password verification
export async function PATCH(req: Request) {
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!bearer) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  const payload = await verifyToken(bearer)
  if (!payload) return NextResponse.json({ error: 'Token non valido' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword)
    return NextResponse.json({ error: 'Campi mancanti' }, { status: 400 })
  if (newPassword.length < 6)
    return NextResponse.json({ error: 'Nuova password min. 6 caratteri' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: payload.id } })
  if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

  const currentHash = await hashPwd(currentPassword)
  if (currentHash !== user.hash) return NextResponse.json({ error: 'Password attuale errata' }, { status: 400 })

  await prisma.user.update({
    where: { id: user.id },
    data: { hash: await hashPwd(newPassword) },
  })

  return NextResponse.json({ ok: true })
}
