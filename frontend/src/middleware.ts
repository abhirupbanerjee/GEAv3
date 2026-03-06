import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Resolves the chatbot iframe origin from environment variables.
 * Used in the CSP frame-src directive to allow the embedded chatbot.
 */
function getChatbotOrigin(): string {
  const chatbotUrl = process.env.NEXT_PUBLIC_CHATBOT_URL || process.env.CHATBOT_URL || ''
  if (!chatbotUrl) return ''
  try {
    return new URL(chatbotUrl).origin
  } catch {
    return ''
  }
}

/**
 * Builds the Content-Security-Policy header value with a per-request nonce.
 */
function buildCSP(nonce: string): string {
  const chatbotOrigin = getChatbotOrigin()
  const frameSrc = chatbotOrigin ? `'self' ${chatbotOrigin}` : `'self'`

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
  ]

  return directives.join('; ')
}

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // Pass nonce to downstream (layout.tsx reads this)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // CSP: use Report-Only mode initially to detect violations without breaking the site.
  // Set CSP_REPORT_ONLY=true in env to use report-only mode.
  const cspHeaderName = process.env.CSP_REPORT_ONLY === 'true'
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy'

  response.headers.set(cspHeaderName, buildCSP(nonce))
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  // Don't leak the nonce in response headers
  response.headers.delete('x-nonce')

  return response
}

export const config = {
  matcher: [
    // Match all paths except static assets
    '/((?!_next/static|_next/image|favicon.ico|uploads/).*)',
  ],
}
