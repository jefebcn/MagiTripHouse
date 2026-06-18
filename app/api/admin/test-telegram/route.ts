import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID

  if (!BOT_TOKEN) return NextResponse.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN mancante' })
  if (!ADMIN_CHAT_ID) return NextResponse.json({ ok: false, error: 'TELEGRAM_ADMIN_CHAT_ID mancante' })

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: '✅ Test notifica ordini — Magic Trip House funziona correttamente!',
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      return NextResponse.json({ ok: false, error: data.description ?? 'Errore Telegram API', raw: data })
    }
    return NextResponse.json({ ok: true, message: 'Messaggio inviato con successo' })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) })
  }
}
