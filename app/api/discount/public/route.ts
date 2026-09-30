import { NextResponse } from 'next/server'
import { publicDiscounts } from '@/lib/discount'

export const dynamic = 'force-dynamic'

// Codici sconto visibili nella scheda Offerte
export async function GET() {
  return NextResponse.json(await publicDiscounts())
}
