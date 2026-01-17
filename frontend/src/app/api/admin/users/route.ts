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
import { pool } from '@/lib/db';
import { getServiceRequestEntityId, getSetting } from '@/lib/settings';

/**
 * GET /api/admin/users
 * List all users with their roles and entities
 * Admin: sees all users
 * Staff: sees only users from their own entity
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !['admin', 'staff'].includes(session.user.roleType)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin or staff access required' },
        { status: 403 }
      );
    }

    const isAdmin = session.user.roleType === 'admin';
    const userEntityId = session.user.entityId;

    // Build query based on role
    let query = `
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
    `;

    const params: string[] = [];

    // Staff can only see users from their own entity
    if (!isAdmin && userEntityId) {
      query += ` WHERE u.entity_id = $1`;
      params.push(userEntityId);
    }

    query += ` ORDER BY u.created_at DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      users: result.rows,
      isStaffView: !isAdmin,
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
 * Admin: can add any user type
 * Staff: can only add staff users for their own entity
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !['admin', 'staff'].includes(session.user.roleType)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin or staff access required' },
        { status: 403 }
      );
    }

    const isAdmin = session.user.roleType === 'admin';
    const creatorEntityId = session.user.entityId;

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

    // Check if role requires entity and get role details
    const roleCheck = await pool.query(
      'SELECT role_type, role_code FROM user_roles WHERE role_id = $1',
      [role_id]
    );

    if (roleCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid role_id' },
        { status: 400 }
      );
    }

    const { role_type: roleType, role_code: roleCode } = roleCheck.rows[0];

    // Staff users can only create staff users for their own entity
    if (!isAdmin) {
      // Staff cannot create admin users
      if (roleType === 'admin') {
        return NextResponse.json(
          { error: 'Staff users cannot create admin accounts' },
          { status: 403 }
        );
      }

      // Staff can only create users for their own entity
      if (!creatorEntityId) {
        return NextResponse.json(
          { error: 'Staff user has no assigned entity' },
          { status: 400 }
        );
      }
    }

    // Get allowed admin entities from settings
    const allowedEntitiesRaw = await getSetting<string>('ADMIN_ALLOWED_ENTITIES', '["AGY-005"]');
    const allowedAdminEntities: string[] = typeof allowedEntitiesRaw === 'string'
      ? JSON.parse(allowedEntitiesRaw)
      : (Array.isArray(allowedEntitiesRaw) ? allowedEntitiesRaw : ['AGY-005']);

    let finalEntityId = entity_id;

    // Staff users must create users for their own entity only
    if (!isAdmin) {
      finalEntityId = creatorEntityId;
    }

    // Handle admin role entity assignment (admin users only)
    if (isAdmin && roleType === 'admin') {
      if (entity_id) {
        // Validate entity is in allowed list
        if (!allowedAdminEntities.includes(entity_id)) {
          return NextResponse.json(
            { error: 'Selected entity is not allowed to have admin users' },
            { status: 400 }
          );
        }
        finalEntityId = entity_id;
      } else {
        // Default to DTA if in allowed list
        const dtaEntityId = await getServiceRequestEntityId();
        if (allowedAdminEntities.includes(dtaEntityId)) {
          finalEntityId = dtaEntityId;
        }
      }
    }

    // Validate entity requirement for staff
    if (roleType === 'staff' && !finalEntityId) {
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
      [email, name, role_id, finalEntityId || null, session.user.email]
    );

    // Log audit event - look up actual user_id from database using session email
    try {
      const adminUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [session.user.email]
      );

      if (adminUser.rows.length > 0) {
        await pool.query(
          `INSERT INTO user_audit_log (user_id, action, resource_type, new_value, created_at)
           VALUES ($1, 'user_created', 'user', $2, CURRENT_TIMESTAMP)`,
          [
            adminUser.rows[0].id,
            JSON.stringify({
              new_user_email: email,
              new_user_name: name,
              role_id,
              entity_id: finalEntityId,
              auto_assigned_entity: roleCode === 'admin_dta' && !entity_id,
            }),
          ]
        );
      }
    } catch (auditError) {
      // Log audit failure but don't fail the user creation
      console.error('Failed to create audit log:', auditError);
    }

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
