// Legge il messaggio Telegram "NUOVO ORDINE — Magic Trip House" generato dal carrello
// e ne ricava i dati per registrarlo a mano dal pannello admin.

export interface ParsedLine { emoji: string; name: string; label: string; qty: number; unitPrice: number }
export interface ParsedOrder {
  id: string | null
  customer: string | null
  createdAt: Date | null
  items: ParsedLine[]
  total: number | null
  note: string
}

const num = (s: string) => parseFloat(s.replace(/\./g, '').replace(',', '.')) // "1.250,00" o "750.00"
const money = (s: string) => (/,\d{2}$/.test(s) ? num(s) : parseFloat(s.replace(/,/g, '')))

// Un "token" è emoji se non contiene lettere né cifre
const isEmojiToken = (t: string) => !!t && !/[A-Za-z0-9À-ÿ]/.test(t)

export function parseOrderMessage(text: string): ParsedOrder {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const find = (re: RegExp) => { for (const l of lines) { const m = l.match(re); if (m) return m } return null }

  const idM = find(/Ordine:\s*(MTH-\d{10,}-[A-Z0-9]+)/i)
  const id = idM ? idM[1].toUpperCase() : null
  const ts = id ? Number(id.split('-')[1]) : NaN
  const createdAt = Number.isFinite(ts) && ts > 1_600_000_000_000 ? new Date(ts) : null

  const custM = find(/Cliente:\s*(.+)$/i)
  const customer = custM ? custM[1].trim() : null

  const items: ParsedLine[] = []
  for (const l of lines) {
    const m = l.match(/^(.+?)\s*\[([^\]]+)\]\s*[×x]\s*(\d+)\s*[—–-]\s*€\s*([\d.,]+)/)
    if (!m) continue
    const tokens = m[1].trim().split(/\s+/)
    const emoji = isEmojiToken(tokens[0]) && tokens.length > 1 ? tokens.shift()! : '📦'
    const qty = Math.max(1, parseInt(m[3], 10))
    const lineTotal = money(m[4])
    items.push({ emoji, name: tokens.join(' ').trim(), label: m[2].trim(), qty, unitPrice: Math.round((lineTotal / qty) * 100) / 100 })
  }

  const totM = find(/TOTALE[^€]*€\s*([\d.,]+)/i)
  const total = totM ? money(totM[1]) : null

  const tags: string[] = []
  if (find(/Ritiro a mano|Ritiro in loco/i)) tags.push('[Solo di persona]')
  const shipM = find(/Spedizione:\s*([^(€\d]+?)\s*\(/i)
  if (shipM) tags.push(`[${shipM[1].trim()}]`)
  const payM = find(/Pagamento:\s*(.+)$/i)
  if (payM) tags.push(/crypto/i.test(payM[1]) ? '[Crypto]' : '[IBAN]')
  const codeM = find(/Codice\s+([A-Z0-9_-]+)\s*\(.*?\):\s*−?-?€\s*([\d.,]+)/i)
  if (codeM) tags.push(`[${codeM[1]} −€${codeM[2]}]`)
  const credM = find(/Credito affiliato:\s*−?-?€\s*([\d.,]+)/i)
  if (credM) tags.push(`[Credito −€${credM[1]}]`)
  const noteM = find(/Note:\s*(.+)$/i)

  return { id, customer, createdAt, items, total, note: [...tags, noteM ? noteM[1].trim() : ''].filter(Boolean).join(' ') }
}
