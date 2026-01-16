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
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all roles
    const result = await pool.query(`
      SELECT
        role_id,
        role_code,
        role_name,
        role_type,
        description,
        created_at
      FROM user_roles
      ORDER BY role_id
    `);

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
