import { scrypt, randomBytes, timingSafeEqual, createHash } from 'node:crypto'

// Formato salvato: scrypt$N$r$p$<salt base64>$<hash base64>
// I vecchi hash (SHA-256 senza salt, 64 caratteri hex) restano verificabili e vengono
// convertiti a scrypt al primo login riuscito (vedi needsRehash).
const N = 16384, R = 8, P = 1, KEYLEN = 32

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, KEYLEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key)))
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(password, salt, N, R, P)
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`
}

function isLegacy(stored: string) {
  return /^[0-9a-f]{64}$/.test(stored)
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (isLegacy(stored)) {
    const legacy = createHash('sha256').update(password).digest()
    return timingSafeEqual(legacy, Buffer.from(stored, 'hex'))
  }
  const [alg, n, r, p, saltB64, keyB64] = stored.split('$')
  if (alg !== 'scrypt' || !saltB64 || !keyB64) return false
  const expected = Buffer.from(keyB64, 'base64')
  const key = await derive(password, Buffer.from(saltB64, 'base64'), Number(n), Number(r), Number(p))
  return key.length === expected.length && timingSafeEqual(key, expected)
}

export function needsRehash(stored: string): boolean {
  return isLegacy(stored) || !stored.startsWith(`scrypt$${N}$${R}$${P}$`)
}

// Hash fittizio: quando l'utente non esiste facciamo comunque il calcolo,
// così il tempo di risposta non rivela se lo username è registrato.
let dummy: Promise<string> | null = null
export async function burnPasswordCheck(password: string) {
  dummy ??= hashPassword('dummy-password-for-timing')
  await verifyPassword(password, await dummy)
}

// Confronto a tempo costante tra stringhe (es. credenziali admin da env)
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}
