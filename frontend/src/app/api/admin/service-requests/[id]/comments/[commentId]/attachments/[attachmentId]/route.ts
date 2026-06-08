/**
 * GEA Portal - Comment Attachment Download API
 *
 * GET /api/admin/service-requests/[id]/comments/[commentId]/attachments/[attachmentId]
 * Download a file attached to a service request comment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { validateEntityAccess } from '@/lib/entity-filter';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string; attachmentId: string }> }
) {
  const { id: requestId, commentId, attachmentId } = await params;

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the service request exists and user has access
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

    if (!validateEntityAccess(session, requestCheck.rows[0].entity_id)) {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    // For staff users, verify the comment is visible to staff
    const isStaff = session.user.roleType === 'staff';
    if (isStaff) {
      const visibilityCheck = await pool.query(
        `SELECT 1 FROM ea_service_request_comments
         WHERE comment_id = $1 AND request_id = $2 AND is_visible_to_staff = true`,
        [commentId, requestId]
      );
      if (visibilityCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Forbidden - Comment not accessible' },
          { status: 403 }
        );
      }
    }

    // Fetch the attachment
    const result = await pool.query(
      `SELECT filename, mimetype, file_content, file_size
       FROM ea_comment_attachments
       WHERE attachment_id = $1 AND comment_id = $2 AND request_id = $3`,
      [attachmentId, commentId, requestId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    return new NextResponse(row.file_content, {
      status: 200,
      headers: {
        'Content-Type': row.mimetype || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${row.filename}"`,
        'Content-Length': String(row.file_size),
      },
    });
  } catch (error) {
    console.error('Error downloading comment attachment:', error);
    return NextResponse.json(
      { error: 'Failed to download attachment' },
      { status: 500 }
    );
  }
}
