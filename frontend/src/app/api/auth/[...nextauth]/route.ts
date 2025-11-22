/**
 * GEA Portal - NextAuth API Route Handler
 *
 * This is the main API route that handles all NextAuth.js authentication requests.
 * The [...nextauth] catch-all route handles all OAuth flows:
 *
 * - /api/auth/signin - Sign in page
 * - /api/auth/signout - Sign out
 * - /api/auth/callback/:provider - OAuth callback
 * - /api/auth/session - Get session
 * - /api/auth/csrf - CSRF token
 * - /api/auth/providers - List providers
 *
 * All authentication logic is configured in lib/auth.ts
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
