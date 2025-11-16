// ============================================
// ADMIN LOGOUT API
// ============================================
// POST /api/admin/logout
// Destroys session and clears cookie
// ============================================

import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/admin-auth'

export async function POST() {
  try {
    await destroySession()
    
    console.log('[Logout API] Session destroyed')
    
    return NextResponse.json(
      { success: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Logout API] Error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}