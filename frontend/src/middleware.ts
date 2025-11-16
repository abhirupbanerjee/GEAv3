// ============================================
// MIDDLEWARE - ADMIN ROUTE PROTECTION
// ============================================
// Fixed version that prevents redirect loops
// ============================================

import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for non-admin routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // ✅ CRITICAL: Always allow the login page itself
  // This prevents the redirect loop
  if (pathname === '/admin' || pathname === '/admin/') {
    console.log('[Middleware] Allowing login page:', pathname)
    return NextResponse.next()
  }

  // For all other /admin/* routes, check authentication
  console.log('[Middleware] Checking auth for:', pathname)
  
  const sessionCookie = request.cookies.get('admin_session')
  
  if (!sessionCookie?.value) {
    console.log('[Middleware] No session, redirecting to /admin')
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Validate session token
  try {
    const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    const [timestamp] = decoded.split('-')
    const tokenAge = Date.now() - parseInt(timestamp, 10)
    const SESSION_DURATION = 2 * 60 * 60 * 1000 // 2 hours
    
    if (tokenAge >= SESSION_DURATION) {
      console.log('[Middleware] Session expired, redirecting to /admin')
      const response = NextResponse.redirect(new URL('/admin', request.url))
      response.cookies.delete('admin_session')
      return response
    }
    
    console.log('[Middleware] Session valid, allowing access')
    return NextResponse.next()
    
  } catch (error) {
    console.log('[Middleware] Invalid session, redirecting to /admin')
    const response = NextResponse.redirect(new URL('/admin', request.url))
    response.cookies.delete('admin_session')
    return response
  }
}

export const config = {
  // ✅ CRITICAL FIX: Use :path+ instead of :path*
  // :path+ requires at least ONE segment after /admin
  // This means /admin/home matches but /admin does NOT
  matcher: ['/admin/:path+'],
}