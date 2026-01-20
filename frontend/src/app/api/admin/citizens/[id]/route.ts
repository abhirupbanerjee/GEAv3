/**
 * GEA Portal - Admin Single Citizen API
 *
 * Endpoints for managing individual citizens.
 * Accessible by admin and staff users.
 *
 * GET /api/admin/citizens/[id] - Get citizen details (PII masked)
 * PATCH /api/admin/citizens/[id] - Update citizen (block/unblock)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';

/**
 * GET /api/admin/citizens/[id]
 * Get citizen details with PII masked
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: citizenId } = await params;
  try {
    // Check authentication - admin or staff
    const session = await getServerSession(authOptions);

    if (!session || !['admin', 'staff'].includes(session.user.roleType)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin or staff access required' },
        { status: 403 }
      );
    }

    // Get citizen details with counts
    const result = await pool.query(
      `SELECT
        c.citizen_id,
        c.phone,
        CASE WHEN c.name IS NOT NULL AND c.name != '' THEN true ELSE false END as has_name,
        CASE WHEN c.email IS NOT NULL AND c.email != '' THEN true ELSE false END as has_email,
        c.phone_verified,
        c.is_active,
        c.registration_complete,
        c.block_reason,
        c.blocked_at,
        c.blocked_by,
        c.created_at,
        c.last_login,
        COALESCE(f.feedback_count, 0) as feedback_count,
        COALESCE(t.ticket_count, 0) as ticket_count
      FROM citizens c
      LEFT JOIN (
        SELECT submitter_id, COUNT(*) as feedback_count
        FROM service_feedback
        WHERE submitter_type = 'citizen'
        GROUP BY submitter_id
      ) f ON c.citizen_id::text = f.submitter_id
      LEFT JOIN (
        SELECT submitter_id, COUNT(*) as ticket_count
        FROM tickets
        WHERE submitter_type = 'citizen'
        GROUP BY submitter_id
      ) t ON c.citizen_id::text = t.submitter_id
      WHERE c.citizen_id = $1`,
      [citizenId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Citizen not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      citizen: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching citizen:', error);
    return NextResponse.json(
      { error: 'Failed to fetch citizen' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/citizens/[id]
 * Update citizen - block or unblock
 *
 * Body:
 * - is_active: boolean (true to unblock, false to block)
 * - block_reason: string (required when blocking)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: citizenId } = await params;
  try {
    // Check authentication - admin or staff
    const session = await getServerSession(authOptions);

    if (!session || !['admin', 'staff'].includes(session.user.roleType)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin or staff access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { is_active, block_reason } = body;

    // Validate is_active is provided
    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active must be a boolean' },
        { status: 400 }
      );
    }

    // Require block_reason when blocking
    if (is_active === false && (!block_reason || block_reason.trim() === '')) {
      return NextResponse.json(
        { error: 'block_reason is required when blocking a citizen' },
        { status: 400 }
      );
    }

    // Check if citizen exists
    const citizenCheck = await pool.query(
      'SELECT citizen_id, is_active FROM citizens WHERE citizen_id = $1',
      [citizenId]
    );

    if (citizenCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Citizen not found' },
        { status: 404 }
      );
    }

    const currentStatus = citizenCheck.rows[0].is_active;

    // Update citizen
    let updateQuery: string;
    let updateParams: any[];

    if (is_active) {
      // Unblocking - clear block fields
      updateQuery = `
        UPDATE citizens
        SET is_active = true, block_reason = NULL, blocked_at = NULL, blocked_by = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE citizen_id = $1
        RETURNING citizen_id, is_active
      `;
      updateParams = [citizenId];
    } else {
      // Blocking - set block fields
      updateQuery = `
        UPDATE citizens
        SET is_active = false, block_reason = $2, blocked_at = CURRENT_TIMESTAMP, blocked_by = $3, updated_at = CURRENT_TIMESTAMP
        WHERE citizen_id = $1
        RETURNING citizen_id, is_active, block_reason, blocked_at, blocked_by
      `;
      updateParams = [citizenId, block_reason.trim(), session.user.email];
    }

    const result = await pool.query(updateQuery, updateParams);

    // Log audit event
    try {
      const adminUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [session.user.email]
      );

      if (adminUser.rows.length > 0) {
        await pool.query(
          `INSERT INTO user_audit_log (user_id, action, resource_type, resource_id, old_value, new_value, created_at)
           VALUES ($1, $2, 'citizen', $3, $4, $5, CURRENT_TIMESTAMP)`,
          [
            adminUser.rows[0].id,
            is_active ? 'citizen_unblocked' : 'citizen_blocked',
            citizenId,
            JSON.stringify({ is_active: currentStatus }),
            JSON.stringify({
              is_active,
              block_reason: is_active ? null : block_reason,
            }),
          ]
        );
      }
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      citizen: result.rows[0],
      message: is_active ? 'Citizen unblocked successfully' : 'Citizen blocked successfully',
    });
  } catch (error) {
    console.error('Error updating citizen:', error);
    return NextResponse.json(
      { error: 'Failed to update citizen' },
      { status: 500 }
    );
  }
}
