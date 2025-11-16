// ============================================
// AUTH CHECK API
// ============================================
// Returns 200 if authenticated, 401 if not
// Used by Header to show Login vs Logout button
// ============================================

import { NextResponse } from 'next/server'
import { validateSession } from '@/lib/admin-auth'

export async function GET() {
  const isAuthenticated = await validateSession()
  
  if (isAuthenticated) {
    return NextResponse.json({ authenticated: true }, { status: 200 })
  }
  
  return NextResponse.json({ authenticated: false }, { status: 401 })
}