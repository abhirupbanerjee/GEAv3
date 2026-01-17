/**
 * GEA Portal - Admin Roles API
 *
 * GET /api/admin/roles - List all available roles
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

/**
 * GET /api/admin/roles
 * List all available roles for user assignment
 * Admin: sees all roles
 * Staff: sees only staff roles (for adding users to their entity)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session || !['admin', 'staff'].includes(session.user.roleType)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin or staff access required' },
        { status: 403 }
      );
    }

    const isAdmin = session.user.roleType === 'admin';

    // Fetch roles - staff users only see staff roles
    let query = `
      SELECT
        role_id,
        role_code,
        role_name,
        role_type,
        description,
        created_at
      FROM user_roles
    `;

    // Staff users can only see staff roles (not admin or public)
    if (!isAdmin) {
      query += ` WHERE role_type = 'staff'`;
    }

    query += ` ORDER BY role_id`;

    const result = await pool.query(query);

    return NextResponse.json({
      success: true,
      roles: result.rows,
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}
