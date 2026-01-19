/**
 * Admin/Staff Profile API
 *
 * GET /api/admin/profile - Get current admin/staff profile
 * PUT /api/admin/profile - Update profile (name only for now)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeQuery } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get full user profile with entity name
    const result = await executeQuery(
      `SELECT
        u.id,
        u.email,
        u.name,
        u.role_id,
        r.role_code,
        r.role_type,
        r.role_name,
        u.entity_id,
        e.entity_name,
        u.is_active,
        u.created_at,
        u.last_login
      FROM users u
      JOIN user_roles r ON u.role_id = r.role_id
      LEFT JOIN entity_master e ON u.entity_id = e.unique_entity_id
      WHERE u.id = $1`,
      [session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.role_id,
        roleCode: user.role_code,
        roleType: user.role_type,
        roleName: user.role_name,
        entityId: user.entity_id,
        entityName: user.entity_name,
        isActive: user.is_active,
        createdAt: user.created_at,
        lastLogin: user.last_login,
      },
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    // Validate name
    if (name !== undefined && typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid name format' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    // Update user name
    const result = await executeQuery(
      `UPDATE users
       SET name = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, name`,
      [name.trim(), session.user.id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        id: result.rows[0].id,
        name: result.rows[0].name,
      },
    });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
