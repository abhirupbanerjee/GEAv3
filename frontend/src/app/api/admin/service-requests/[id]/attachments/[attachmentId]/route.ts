/**
 * GEA Portal - Service Request Attachment Download API
 *
 * GET /api/admin/service-requests/[id]/attachments/[attachmentId] - Download attachment file
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';
import { validateEntityAccess } from '@/lib/entity-filter';

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
 * GET /api/admin/service-requests/[id]/attachments/[attachmentId]
 * Download a specific attachment file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; attachmentId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestId = params.id;
    const attachmentId = params.attachmentId;

    // First, get the request to validate entity access
    const requestQuery = `
      SELECT entity_id FROM ea_service_requests WHERE request_id = $1
    `;
    const requestResult = await pool.query(requestQuery, [requestId]);

    if (requestResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Service request not found' },
        { status: 404 }
      );
    }

    // Validate entity access for staff users
    if (!validateEntityAccess(session, requestResult.rows[0].entity_id)) {
      return NextResponse.json(
        { error: 'Forbidden - You can only access attachments from your assigned entity' },
        { status: 403 }
      );
    }

    // Fetch the attachment with file content
    const attachmentQuery = `
      SELECT
        attachment_id,
        request_id,
        filename,
        mimetype,
        file_content,
        file_size
      FROM ea_service_request_attachments
      WHERE attachment_id = $1 AND request_id = $2
    `;

    const attachmentResult = await pool.query(attachmentQuery, [attachmentId, requestId]);

    if (attachmentResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    const attachment = attachmentResult.rows[0];

    // Return the file as a download
    const response = new NextResponse(attachment.file_content, {
      status: 200,
      headers: {
        'Content-Type': attachment.mimetype,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
        'Content-Length': attachment.file_size.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });

    return response;
  } catch (error) {
    console.error('Error downloading attachment:', error);
    return NextResponse.json(
      { error: 'Failed to download attachment' },
      { status: 500 }
    );
  }
}
