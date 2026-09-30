// Coda ordini lato client: se il salvataggio sul server fallisce (rete, sessione scaduta…)
// l'ordine resta sul telefono e viene reinviato in automatico. Mai più ordini persi in silenzio.
const KEY = 'mth_order_outbox'

export type SaveResult = 'saved' | 'auth' | 'failed'

type Pending = { id: string; body: string; createdAt: number }

function read(): Pending[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Pending[] } catch { return [] }
}
function write(list: Pending[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* storage non disponibile */ }
}

async function post(body: string, token: string): Promise<SaveResult> {
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body,
    })
    if (res.ok) return 'saved'
    if (res.status === 401) return 'auth'
    return 'failed'
  } catch {
    return 'failed'
  }
}

// Invia un ordine; se non va a buon fine lo mette in coda per i tentativi successivi
export async function submitOrder(id: string, payload: unknown, token: string): Promise<SaveResult> {
  const body = JSON.stringify(payload)
  const r = await post(body, token)
  if (r !== 'saved') write([...read().filter(p => p.id !== id), { id, body, createdAt: Date.now() }])
  return r
}

export function pendingCount(): number {
  return read().length
}

// Reinvia gli ordini in coda (all'avvio dell'app, dopo il login, ogni minuto)
export async function flushOutbox(token: string): Promise<{ saved: number; left: number }> {
  const list = read()
  if (!list.length || !token) return { saved: 0, left: list.length }
  const left: Pending[] = []
  let saved = 0
  for (const p of list) {
    const r = await post(p.body, token)
    if (r === 'saved') saved++
    else left.push(p)
  }
  write(left)
  return { saved, left: left.length }
}
