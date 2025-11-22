/**
 * GEA Portal - Authentication Middleware
 *
 * This middleware protects admin and staff routes by checking for a valid
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
 */

export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/admin/:path*',
    '/staff/:path*',
  ],
};
