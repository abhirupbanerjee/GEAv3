/**
 * Citizen Password Change API
 *
 * PUT /api/citizen/profile/password
 *
 * Allows authenticated citizens to change their password.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCitizen, hashPassword, verifyPassword } from '@/lib/citizen-auth';
import { pool } from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    // Get current citizen
    const citizen = await getCurrentCitizen();
    if (!citizen) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'All password fields are required' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'New passwords do not match' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Get current password hash from database
    const result = await pool.query(
      'SELECT password_hash FROM citizens WHERE citizen_id = $1',
      [citizen.citizen_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Citizen not found' },
        { status: 404 }
      );
    }

    const { password_hash } = result.rows[0];

    // Verify current password
    if (!password_hash) {
      return NextResponse.json(
        { success: false, error: 'No password set. Please register first.' },
        { status: 400 }
      );
    }

    const isValidPassword = await verifyPassword(currentPassword, password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password in database
    await pool.query(
      'UPDATE citizens SET password_hash = $1 WHERE citizen_id = $2',
      [newPasswordHash, citizen.citizen_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
