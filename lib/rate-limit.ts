import { prisma } from './prisma'

// Limite tentativi salvato su DB (le funzioni serverless non condividono memoria).
// Ogni chiave conta i fallimenti in una finestra; superato il limite resta bloccata per `lockMs`.
export interface Limit { max: number; windowMs: number; lockMs: number }

export const LIMITS = {
  loginUser:  { max: 5,  windowMs: 15 * 60_000, lockMs: 15 * 60_000 },  // per username
  loginIp:    { max: 20, windowMs: 15 * 60_000, lockMs: 30 * 60_000 },  // per IP (più username)
  adminLogin: { max: 5,  windowMs: 15 * 60_000, lockMs: 30 * 60_000 },  // pannello admin, per IP
  register:   { max: 5,  windowMs: 60 * 60_000, lockMs: 60 * 60_000 },  // registrazioni per IP
  password:   { max: 5,  windowMs: 15 * 60_000, lockMs: 15 * 60_000 },  // cambio password, per utente
} satisfies Record<string, Limit>

export function clientIp(req: Request): string {
  const h = req.headers
  return (h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0] ?? 'unknown').trim().slice(0, 64)
}

// Millisecondi rimanenti di blocco (0 = libero)
export async function lockedFor(key: string): Promise<number> {
  const row = await prisma.loginAttempt.findUnique({ where: { key } })
  const left = row?.lockedUntil ? row.lockedUntil.getTime() - Date.now() : 0
  return left > 0 ? left : 0
}

export async function registerFailure(key: string, limit: Limit): Promise<void> {
  const now = new Date()
  const row = await prisma.loginAttempt.findUnique({ where: { key } })
  const expired = !row || now.getTime() - row.windowStart.getTime() > limit.windowMs
  const count = expired ? 1 : row.count + 1
  const data = {
    count,
    windowStart: expired ? now : row.windowStart,
    lockedUntil: count >= limit.max ? new Date(now.getTime() + limit.lockMs) : null,
  }
  await prisma.loginAttempt.upsert({ where: { key }, create: { key, ...data }, update: data })
}

export async function clearFailures(key: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key } })
}

export function lockMessage(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60_000))
  return `Troppi tentativi. Riprova tra ${min} minut${min === 1 ? 'o' : 'i'}.`
}
