import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { safeEqual } from './password'
import { LIMITS, clientIp, lockedFor, registerFailure, clearFailures } from './rate-limit'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        const u = credentials?.username
        const p = credentials?.password
        const adminUser = process.env.ADMIN_USERNAME
        const adminPwd = process.env.ADMIN_PASSWORD
        if (typeof u !== 'string' || typeof p !== 'string' || !adminUser || !adminPwd) return null

        // Blocco per IP dopo troppi tentativi falliti
        const key = `admin:ip:${clientIp(request)}`
        if (await lockedFor(key)) return null

        // Valuta entrambi i confronti (tempo costante, nessun cortocircuito)
        const okUser = safeEqual(u, adminUser)
        const okPwd = safeEqual(p, adminPwd)
        if (okUser && okPwd) {
          await clearFailures(key)
          return { id: '1', name: u, role: 'admin' }
        }
        await registerFailure(key, LIMITS.adminLogin)
        return null
      },
    }),
  ],
  pages: { signIn: '/admin/login' },
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role
      return token
    },
    session({ session, token }) {
      if (session.user) (session.user as { role?: unknown }).role = token.role
      return session
    },
  },
})
