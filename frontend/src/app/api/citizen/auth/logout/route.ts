/**
 * Citizen Logout API
 *
 * POST /api/citizen/auth/logout
 *
 * Destroys the current session and clears the session cookie.
 * Note: Does NOT clear the device trust cookie (for "remember me" persistence).
 */

import { NextRequest, NextResponse } from 'next/server';
import { performLogout } from '@/lib/citizen-auth';

export async function POST(request: NextRequest) {
  try {
    await performLogout();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
