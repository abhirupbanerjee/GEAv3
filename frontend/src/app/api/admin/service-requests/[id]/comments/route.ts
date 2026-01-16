/**
 * GEA Portal - Service Request Comments API
 *
 * GET /api/admin/service-requests/[id]/comments - Get all comments for a request
 * POST /api/admin/service-requests/[id]/comments - Add new comment/note
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { validateEntityAccess } from '@/lib/entity-filter';

/**
 * GET /api/admin/service-requests/[id]/comments
 * Retrieve all comments for a service request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = params.id;

    // First verify access to this request
    const requestCheck = await pool.query(
      'SELECT entity_id FROM ea_service_requests WHERE request_id = $1',
      [requestId]
    );

    if (requestCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Service request not found' },
        { status: 404 }
      );
    }

    // Validate entity access
    if (!validateEntityAccess(session, requestCheck.rows[0].entity_id)) {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    const isStaff = session.user.roleType === 'staff';

    // Fetch comments (filter for staff users)
    const query = `
      SELECT
        comment_id,
        request_id,
        comment_text,
        comment_type,
        is_status_change,
        old_status,
        new_status,
        created_by,
        created_at,
        is_visible_to_staff
      FROM ea_service_request_comments
      WHERE request_id = $1
        ${isStaff ? 'AND is_visible_to_staff = true' : ''}
      ORDER BY created_at ASC
    `;

    const result = await pool.query(query, [requestId]);

    return NextResponse.json({
      success: true,
      data: {
        comments: result.rows,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch comments',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/service-requests/[id]/comments
 * Add a new comment/note to a service request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = params.id;
    const body = await request.json();
    const { comment_text, comment_type, is_visible_to_staff } = body;

    // Validation
    if (!comment_text || !comment_text.trim()) {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      );
    }

    // Verify access to this request
    const requestCheck = await pool.query(
      'SELECT entity_id FROM ea_service_requests WHERE request_id = $1',
      [requestId]
    );

    if (requestCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Service request not found' },
        { status: 404 }
      );
    }

    // Validate entity access
    if (!validateEntityAccess(session, requestCheck.rows[0].entity_id)) {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    const isAdmin = session.user.roleType === 'admin';

    // Staff can only add visible comments
    // Admin can control visibility
    const visibility = isAdmin ? (is_visible_to_staff !== false) : true;
    const type = comment_type || 'internal_note';

    // Insert comment
    const result = await pool.query(
      `INSERT INTO ea_service_request_comments (
        request_id,
        comment_text,
        comment_type,
        is_status_change,
        created_by,
        is_visible_to_staff,
        created_at
      ) VALUES ($1, $2, $3, false, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *`,
      [requestId, comment_text.trim(), type, session.user.email, visibility]
    );

    return NextResponse.json({
      success: true,
      data: {
        comment: result.rows[0],
      },
      message: 'Comment added successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add comment',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
