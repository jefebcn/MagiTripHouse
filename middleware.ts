import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAdminPath = pathname.startsWith('/admin')
  const isLoginPage = pathname === '/admin/login'

  if (!isAdminPath) return NextResponse.next()

  // next-auth v5 stores session in one of these cookies
  const session =
    request.cookies.get('authjs.session-token') ??
    request.cookies.get('__Secure-authjs.session-token')

  if (!isLoginPage && !session) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }
  if (isLoginPage && session) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
