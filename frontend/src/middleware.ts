/**
 * GEA Portal - Authentication & Security Middleware
 *
 * Handles two concerns at the edge:
 * 1. Authentication gating for protected routes:
 *    - /admin/* and /staff/* require a valid NextAuth JWT session
 *    - /citizen/* requires a valid citizen session cookie
 * 2. Security headers (CSP with nonce, Referrer-Policy, etc.) for all routes
 *
 * Unauthenticated requests are redirected to /auth/signin with the
 * original URL preserved as callbackUrl so users return after login.
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

/**
 * Resolves the chatbot iframe origin from environment variables.
 * Used in the CSP frame-src directive to allow the embedded chatbot.
 */
function getChatbotOrigin(): string {
  const chatbotUrl = process.env.NEXT_PUBLIC_CHATBOT_URL || process.env.CHATBOT_URL || '';
  if (!chatbotUrl) return '';
  try {
    return new URL(chatbotUrl).origin;
  } catch {
    return '';
  }
}

/**
 * Builds the Content-Security-Policy header value with a per-request nonce.
 */
function buildCSP(nonce: string): string {
  const chatbotOrigin = getChatbotOrigin();
  const frameSrc = chatbotOrigin ? `'self' ${chatbotOrigin}` : `'self'`;

  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `frame-src ${frameSrc}`,
    `frame-ancestors 'self'`,
    `form-action 'self' https://accounts.google.com https://login.microsoftonline.com`,
    `base-uri 'self'`,
    `object-src 'none'`,
  ];

  return directives.join('; ');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Generate nonce for CSP (passed downstream via request header)
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  // Admin / Staff routes: require NextAuth JWT
  if (pathname.startsWith('/admin') || pathname.startsWith('/staff')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.redirect(buildSignInUrl(request));
    }
  }

  // Citizen routes: require citizen session cookie
  if (pathname.startsWith('/citizen')) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return NextResponse.redirect(buildSignInUrl(request));
    }
    // The cookie presence is checked here; full validation happens in API routes.
    // This is sufficient to avoid showing stale pages to users without any session.
  }

  // Build response with security headers for all routes
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // CSP: set CSP_REPORT_ONLY=true in env to use report-only mode for safe rollout
  const cspHeaderName = process.env.CSP_REPORT_ONLY === 'true'
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy';

  response.headers.set(cspHeaderName, buildCSP(nonce));
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Don't leak the nonce in response headers
  response.headers.delete('x-nonce');

  return response;
}

export const config = {
  matcher: [
    // All routes except static assets (CSP headers needed everywhere)
    '/((?!_next/static|_next/image|favicon.ico|uploads/).*)',
  ],
};
