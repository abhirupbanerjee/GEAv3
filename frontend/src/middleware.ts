import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect admin pages (not login)
  if (!pathname.startsWith('/admin') || pathname === '/admin') {
    return NextResponse.next()
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get('admin_session')
  
  if (!sessionCookie?.value) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  // Validate session
  try {
    const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    const [timestamp] = decoded.split('-')
    const tokenAge = Date.now() - parseInt(timestamp, 10)
    
    // 2 hours = 7200000 ms
    if (tokenAge >= 7200000) {
      const response = NextResponse.redirect(new URL('/admin', request.url))
      response.cookies.delete('admin_session')
      return response
    }
    
    return NextResponse.next()
    
  } catch (error) {
    const response = NextResponse.redirect(new URL('/admin', request.url))
    response.cookies.delete('admin_session')
    return response
  }
}

export const config = {
  matcher: ['/admin/:path+'],
}