/**
 * GEA Portal - Admin Users API
 *
 * Endpoints for managing authorized users in the system.
 * Only accessible by admin users.
 *
 * GET /api/admin/users - List all users
 * POST /api/admin/users - Add new user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'feedback',
  user: process.env.DB_USER || 'feedback_user',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * GET /api/admin/users
 * List all users with their roles and entities
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

    // Fetch all users with role and entity information
    const result = await pool.query(`
      SELECT
        u.id,
        u.email,
        u.name,
        u.image,
        u.role_id,
        r.role_code,
        r.role_name,
        r.role_type,
        u.entity_id,
        e.entity_name,
        u.is_active,
        u.provider,
        u.last_login,
        u.created_at,
        u.updated_at
      FROM users u
      JOIN user_roles r ON u.role_id = r.role_id
      LEFT JOIN entity_master e ON u.entity_id = e.unique_entity_id
      ORDER BY u.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      users: result.rows,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Add a new user to the system
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session || session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { email, name, role_id, entity_id } = body;

    // Validate required fields
    if (!email || !name || !role_id) {
      return NextResponse.json(
        { error: 'Missing required fields: email, name, role_id' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Check if role requires entity
    const roleCheck = await pool.query(
      'SELECT role_type FROM user_roles WHERE role_id = $1',
      [role_id]
    );

    if (roleCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid role_id' },
        { status: 400 }
      );
    }

    const roleType = roleCheck.rows[0].role_type;
    if (roleType === 'staff' && !entity_id) {
      return NextResponse.json(
        { error: 'entity_id is required for staff users' },
        { status: 400 }
      );
    }

    // Insert new user
    const result = await pool.query(
      `INSERT INTO users (email, name, role_id, entity_id, is_active, provider, created_by)
       VALUES ($1, $2, $3, $4, true, 'google', $5)
       RETURNING id, email, name, role_id, entity_id, is_active, created_at`,
      [email, name, role_id, entity_id || null, session.user.email]
    );

    // Log audit event
    await pool.query(
      `INSERT INTO user_audit_log (user_id, action, resource_type, new_value, created_at)
       VALUES ($1, 'user_created', 'user', $2, CURRENT_TIMESTAMP)`,
      [
        session.user.id,
        JSON.stringify({
          new_user_email: email,
          new_user_name: name,
          role_id,
          entity_id,
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      user: result.rows[0],
      message: 'User added successfully',
    });
  } catch (error) {
    console.error('Error adding user:', error);
    return NextResponse.json(
      { error: 'Failed to add user' },
      { status: 500 }
    );
  }
}
