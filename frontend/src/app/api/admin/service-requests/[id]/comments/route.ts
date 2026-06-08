/**
 * GEA Portal - Service Request Comments API
 *
 * GET /api/admin/service-requests/[id]/comments - Get all comments for a request
 * POST /api/admin/service-requests/[id]/comments - Add new comment/note (with optional file attachments)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool, withTransaction } from '@/lib/db';
import { validateEntityAccess } from '@/lib/entity-filter';

/**
 * GET /api/admin/service-requests/[id]/comments
 * Retrieve all comments for a service request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params;
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Fetch comments with their attachments (filter for staff users)
    const query = `
      SELECT
        c.comment_id,
        c.request_id,
        c.comment_text,
        c.comment_type,
        c.is_status_change,
        c.old_status,
        c.new_status,
        c.created_by,
        c.created_at,
        c.is_visible_to_staff,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'attachment_id', a.attachment_id,
              'filename', a.filename,
              'mimetype', a.mimetype,
              'file_size', a.file_size,
              'uploaded_by', a.uploaded_by,
              'created_at', a.created_at
            ) ORDER BY a.created_at ASC
          ) FILTER (WHERE a.attachment_id IS NOT NULL),
          '[]'
        ) AS attachments
      FROM ea_service_request_comments c
      LEFT JOIN ea_comment_attachments a ON c.comment_id = a.comment_id
      WHERE c.request_id = $1
        ${isStaff ? 'AND c.is_visible_to_staff = true' : ''}
      GROUP BY c.comment_id
      ORDER BY c.created_at ASC
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
 * Add a new comment/note to a service request (with optional file attachments)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params;
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const comment_text = formData.get('comment_text')?.toString() ?? '';
    const comment_type = formData.get('comment_type')?.toString() || 'internal_note';
    const is_visible_to_staff_raw = formData.get('is_visible_to_staff')?.toString() ?? 'true';

    // Collect uploaded files
    const files: File[] = [];
    const fileEntries = formData.getAll('files');
    for (const f of fileEntries) {
      if (f instanceof File && f.size > 0) {
        files.push(f);
      }
    }

    // Validation: must have text or at least one file
    if (!comment_text.trim() && files.length === 0) {
      return NextResponse.json(
        { error: 'Comment text or at least one file is required' },
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
    const visibility = isAdmin ? (is_visible_to_staff_raw !== 'false') : true;
    const type = comment_type || 'internal_note';

    // Validate file sizes (max 10MB each)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the 10 MB limit` },
          { status: 400 }
        );
      }
    }

    // Insert comment and attachments in a transaction
    const commentWithAttachments = await withTransaction(async (client) => {
      // Insert comment
      const commentResult = await client.query(
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
        [requestId, comment_text.trim() || '(file attachment)', type, session.user.email, visibility]
      );
      const comment = commentResult.rows[0];

      // Insert attachments
      const attachments = [];
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const attResult = await client.query(
          `INSERT INTO ea_comment_attachments (
            comment_id,
            request_id,
            filename,
            mimetype,
            file_content,
            file_size,
            uploaded_by,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
          RETURNING attachment_id, filename, mimetype, file_size, uploaded_by, created_at`,
          [
            comment.comment_id,
            requestId,
            file.name,
            file.type || 'application/octet-stream',
            buffer,
            file.size,
            session.user.email,
          ]
        );
        attachments.push(attResult.rows[0]);
      }

      return { ...comment, attachments };
    });

    return NextResponse.json({
      success: true,
      data: {
        comment: commentWithAttachments,
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
