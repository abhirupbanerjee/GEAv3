/**
 * GEA Portal - Admin Single User API
 *
 * Endpoints for managing individual users.
 * Only accessible by admin users.
 *
 * PATCH /api/admin/users/[id] - Update user (e.g., toggle active status)
 * DELETE /api/admin/users/[id] - Delete user (soft delete by deactivating)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

/**
 * PATCH /api/admin/users/[id]
 * Update user details (e.g., toggle active status, change role, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Get old user data for audit log
    const oldUserData = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (oldUserData.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build update query dynamically based on provided fields
    const allowedFields = ['name', 'role_id', 'entity_id', 'is_active'];
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Add updated_by and updated_at
    updates.push(`updated_by = $${paramIndex}`);
    values.push(session.user.email);
    paramIndex++;

    values.push(userId);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    // Log audit event
    await pool.query(
      `INSERT INTO user_audit_log (user_id, action, resource_type, resource_id, old_value, new_value, created_at)
       VALUES ($1, 'user_updated', 'user', $2, $3, $4, CURRENT_TIMESTAMP)`,
      [
        session.user.id,
        userId,
        JSON.stringify(oldUserData.rows[0]),
        JSON.stringify(body),
      ]
    );

    return NextResponse.json({
      success: true,
      user: result.rows[0],
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Soft delete a user by setting is_active to false
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Prevent self-deletion
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Soft delete by setting is_active to false
    const result = await pool.query(
      `UPDATE users
       SET is_active = false, updated_by = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [session.user.email, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Log audit event
    await pool.query(
      `INSERT INTO user_audit_log (user_id, action, resource_type, resource_id, created_at)
       VALUES ($1, 'user_deleted', 'user', $2, CURRENT_TIMESTAMP)`,
      [session.user.id, userId]
    );

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
