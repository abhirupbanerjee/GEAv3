/**
 * GEA Portal - Authentication Proxy & Security Headers
 *
 * This proxy handles two concerns:
 * 1. CSP + security headers (all routes) — nonce-based Content-Security-Policy,
 *    Referrer-Policy, X-Content-Type-Options, X-Frame-Options, Permissions-Policy
 * 2. Authentication (admin/staff routes only) — checks NextAuth session,
 *    redirects to sign-in if missing
 *
 * Protected routes:
 * - /admin/* - Admin portal (requires admin role)
 * - /staff/* - Staff portal (requires staff role)
 *
 * Note: Next.js 16 uses proxy.ts instead of middleware.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

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
    `img-src 'self' data: blob:`,
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

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Pass nonce to downstream (layout.tsx reads this via headers())
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  // Auth check for protected routes only
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/admin') || pathname.startsWith('/staff')) {
    const token = await getToken({ req: request });
    if (!token) {
      const signInUrl = new URL('/auth/signin', request.url);
      const callbackUrl = pathname + request.nextUrl.search;
      signInUrl.searchParams.set('callbackUrl', callbackUrl);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Build response with security headers
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
