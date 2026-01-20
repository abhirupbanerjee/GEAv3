/**
 * GEA Portal - Authentication Proxy
 *
 * This proxy protects admin and staff routes by checking for a valid
 * NextAuth session. If no session exists, users are redirected to the sign-in page.
 *
 * Protected routes:
 * - /admin/* - Admin portal (requires admin role)
 * - /staff/* - Staff portal (requires staff role)
 *
 * Public routes:
 * - /auth/* - Authentication pages
 * - /api/auth/* - NextAuth API routes
 * - / - Public homepage
 * - /feedback - Public feedback form
 *
 * Note: Next.js 16 uses proxy.ts instead of middleware.ts.
 * Using getToken from next-auth/jwt for session validation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) {
    const signInUrl = new URL('/auth/signin', request.url);
    // Use only the pathname + search params to avoid localhost in callbackUrl
    const requestUrl = new URL(request.url);
    const callbackUrl = requestUrl.pathname + requestUrl.search;
    signInUrl.searchParams.set('callbackUrl', callbackUrl);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/staff/:path*',
  ],
};
