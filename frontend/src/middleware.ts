import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin routes protection
  if (pathname.startsWith('/admin')) {
    // Allow login page
    if (pathname === '/admin') {
      return NextResponse.next()
    }

    // Check for session cookie
    const sessionCookie = request.cookies.get('admin_session')
    
    if (!sessionCookie?.value) {
      // No session - redirect to login
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // Validate session
    try {
      const sessionData = JSON.parse(
        Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
      )
      
      const expiresAt = new Date(sessionData.expiresAt).getTime()
      const now = Date.now()
      
      if (now > expiresAt) {
        // Session expired
        const response = NextResponse.redirect(new URL('/admin', request.url))
        response.cookies.delete('admin_session')
        return response
      }
      
      // Session valid
      return NextResponse.next()
      
    } catch (error) {
      // Invalid session
      const response = NextResponse.redirect(new URL('/admin', request.url))
      response.cookies.delete('admin_session')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}