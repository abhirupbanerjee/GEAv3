// ============================================
// ADMIN LOGOUT API
// ============================================
// POST /api/admin/auth/logout
// Destroys admin session
// ============================================

import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await destroySession();
    
    return NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}