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