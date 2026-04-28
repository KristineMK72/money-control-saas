// middleware.ts
import { createMiddlewareClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if needed
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = req.nextUrl.pathname

  // Public routes that don't require auth
  const publicRoutes = ['/', '/login', '/signup', '/auth/callback']

  if (publicRoutes.includes(pathname)) {
    // If user is already logged in and tries to go to login/signup, send them to dashboard
    if (session && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return res
  }

  // Protected routes - require login
  if (!session) {
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Optional: Onboarding + Premium checks
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_complete, is_premium')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!profile) {
    if (!pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
    return res
  }

  if (!profile.onboarding_complete && !pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  const premiumRoutes = [
    '/forecast',
    '/analytics',
    '/chat/premium',
    '/credit',
    '/credit/disputes',
    '/credit/templates',
    '/credit/builder',
  ]

  if (premiumRoutes.some((route) => pathname.startsWith(route))) {
    if (!profile.is_premium) {
      return NextResponse.redirect(new URL('/upgrade', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static
