/**
 * @pageContext
 * @title Admin Redirect
 * @purpose Automatic redirect page that routes authenticated users to their appropriate dashboard
 * @audience staff
 * @features
 *   - Server-side authentication check
 *   - Automatic redirect to /admin/home for authenticated users
 *   - Redirect to sign-in for unauthenticated users
 * @tips
 *   - This page handles routing logic only - you won't see content here
 *   - Authenticated users go directly to /admin/home
 *   - Non-authenticated users go to /auth/signin
 * @relatedPages
 *   - /admin/home: Destination for authenticated users
 *   - /auth/signin: Destination for non-authenticated users
 * @permissions
 *   - staff: Redirects to admin dashboard
 *   - admin: Redirects to admin dashboard
 *   - public: Redirects to sign-in page
 */

// ============================================
// ADMIN DASHBOARD HOME - REDIRECT PAGE
// ============================================
// This page redirects authenticated users to the admin dashboard
// NextAuth middleware handles authentication redirects
// ============================================

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function AdminPage() {
  // Get NextAuth session
  const session = await getServerSession(authOptions)

  // If authenticated, redirect to dashboard
  if (session) {
    redirect('/admin/home')
  }

  // If not authenticated, NextAuth middleware will redirect to /auth/signin
  // This should never be reached, but redirect anyway
  redirect('/auth/signin?callbackUrl=/admin')
}