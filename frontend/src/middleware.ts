/**
 * GEA Portal - Authentication Middleware
 *
 * Handles authentication gating at the edge for protected routes:
 * - /admin/* and /staff/* require a valid NextAuth JWT session
 * - /citizen/* requires a valid citizen session cookie
 *
 * Unauthenticated requests are redirected to /auth/signin with the
 * original URL preserved as callbackUrl so users return after login.
 *
 * Note: CSP/security headers remain in proxy.ts and are applied via
 * Next.js headers config in next.config.js.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { validateCallbackUrlServer } from '@/lib/callback-url';

const SESSION_COOKIE_NAME = 'citizen_session';

function buildSignInUrl(request: NextRequest): URL {
  const signInUrl = new URL('/auth/signin', request.url);
  const rawCallbackUrl = request.nextUrl.pathname + request.nextUrl.search;
  const safeCallbackUrl = validateCallbackUrlServer(rawCallbackUrl, '/', request.url);
  signInUrl.searchParams.set('callbackUrl', safeCallbackUrl);
  return signInUrl;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin / Staff routes: require NextAuth JWT
  if (pathname.startsWith('/admin') || pathname.startsWith('/staff')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.redirect(buildSignInUrl(request));
    }

    return NextResponse.next();
  }

  // Citizen routes: require citizen session cookie
  if (pathname.startsWith('/citizen')) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return NextResponse.redirect(buildSignInUrl(request));
    }

    // The cookie presence is checked here; full validation happens in API routes.
    // This is sufficient to avoid showing stale pages to users without any session.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/staff/:path*', '/citizen/:path*'],
};
