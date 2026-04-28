const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID

export async function notifyAdminOrder(order: {
  id: string
  userId: string
  total: number
  items: unknown
  note?: string | null
  referredBy?: string | null
}) {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) return

  const items = Array.isArray(order.items) ? order.items as Array<{
    id?: string; label?: string; price?: number; qty?: number
  }> : []

  const lines = [
    `🛒 *NUOVO ORDINE — Magic Trip House*`,
    ``,
    `🆔 \`${order.id}\``,
    `👤 Cliente: @${order.userId}`,
    ``,
    `📦 *Prodotti:*`,
    ...items.map(x => `• ${x.label ?? x.id} ×${x.qty ?? 1} — €${((x.price ?? 0) * (x.qty ?? 1)).toFixed(2)}`),
    ``,
    `💰 *TOTALE: €${order.total.toFixed(2)}*`,
  ]
  if (order.note) lines.push(``, `📝 Note: ${order.note}`)
  if (order.referredBy) lines.push(`🔗 Ref: ${order.referredBy}`)

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      text: lines.join('\n'),
      parse_mode: 'Markdown',
    }),
  }).catch(() => {})
}
