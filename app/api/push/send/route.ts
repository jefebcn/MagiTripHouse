import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { sendPushToAll } from '@/lib/push'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await req.json()
  const result = await sendPushToAll(payload)
  return NextResponse.json(result)
}
