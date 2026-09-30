import { NextResponse } from 'next/server'
import { getBearerUser } from '@/lib/session'
import { usedCodes } from '@/lib/discount'

export const dynamic = 'force-dynamic'

// Codici già usati dal cliente loggato (per mostrarli come "già usato" nelle Offerte)
export async function GET(req: Request) {
  const user = await getBearerUser(req)
  if (!user) return NextResponse.json([], { status: 401 })
  return NextResponse.json(await usedCodes(user.handle))
}
