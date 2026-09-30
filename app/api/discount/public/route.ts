import { NextResponse } from 'next/server'
import { publicDiscounts } from '@/lib/discount'

export const dynamic = 'force-dynamic'

// Codici sconto pubblici per la scheda Offerte
export async function GET() {
  return NextResponse.json(await publicDiscounts())
}
