// middleware.ts - Minimal version
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Allow public routes
  if (pathname === '/login' || pathname === '/signup' || pathname.startsWith('/auth')) {
    return NextResponse.next()
  }

  // For all other routes, redirect to login if not authenticated
  // (We'll let the page itself check the session)
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
