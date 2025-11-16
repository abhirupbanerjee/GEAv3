// ============================================
// ADMIN LOGIN API
// ============================================
// POST /api/admin/login
// Validates password and creates session
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, createSession } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(password)

    if (!isValid) {
      console.log('[Login API] Invalid password attempt')
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Create session
    await createSession()
    
    console.log('[Login API] Login successful, session created')
    
    return NextResponse.json(
      { success: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Login API] Error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}