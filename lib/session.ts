import { SignJWT, jwtVerify } from 'jose'

// In produzione il segreto è obbligatorio: con un fallback fisso chiunque potrebbe firmarsi un token
const secret = () => {
  const s = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET
  if (!s && process.env.NODE_ENV === 'production') throw new Error('NEXTAUTH_SECRET mancante')
  return new TextEncoder().encode(s ?? 'dev-secret-change-me')
}

export interface SessionPayload {
  id: string
  handle: string
  role: string
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('90d')
    .sign(secret())
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// Utente autenticato dal token di sessione (header "Authorization: Bearer <token>")
export async function getBearerUser(req: Request): Promise<SessionPayload | null> {
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!bearer) return null
  return verifyToken(bearer)
}
