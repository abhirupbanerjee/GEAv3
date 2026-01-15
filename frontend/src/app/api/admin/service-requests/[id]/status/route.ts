/**
 * GEA Portal - Service Request Status Change API
 *
 * PUT /api/admin/service-requests/[id]/status - Change request status with comment
 * Sends email notification to requester
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';
import { validateEntityAccess } from '@/lib/entity-filter';
import { sendEmail } from '@/lib/sendgrid';
import { getServiceRequestStatusChangeEmail } from '@/lib/emailTemplates';
import { config } from '@/config/env';

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
 * PUT /api/admin/service-requests/[id]/status
 * Change status of a service request with optional comment
 * Admin only - sends email notification
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can change status
    if (session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Only administrators can change request status' },
        { status: 403 }
      );
    }

    const requestId = params.id;
    const body = await request.json();
    const { new_status, comment } = body;

    // Validation
    if (!new_status) {
      return NextResponse.json(
        { error: 'new_status is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['submitted', 'in_progress', 'under_review', 'completed', 'rejected'];
    if (!validStatuses.includes(new_status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch current request details
    const requestQuery = `
      SELECT
        r.request_id,
        r.request_number,
        r.status as current_status,
        r.requester_name,
        r.requester_email,
        r.entity_id,
        s.service_name
      FROM ea_service_requests r
      JOIN service_master s ON r.service_id = s.service_id
      WHERE r.request_id = $1
    `;

    const requestResult = await pool.query(requestQuery, [requestId]);

    if (requestResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Service request not found' },
        { status: 404 }
      );
    }

    const requestData = requestResult.rows[0];
    const oldStatus = requestData.current_status;

    // Check if status is actually changing
    if (oldStatus === new_status) {
      return NextResponse.json(
        { error: 'New status is the same as current status' },
        { status: 400 }
      );
    }

    // Validate entity access
    if (!validateEntityAccess(session, requestData.entity_id)) {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    // Begin transaction
    await pool.query('BEGIN');

    try {
      // Update request status
      await pool.query(
        `UPDATE ea_service_requests
         SET status = $1,
             updated_by = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE request_id = $3`,
        [new_status, session.user.email, requestId]
      );

      // Add status change comment
      const commentText = comment?.trim() || `Status changed from "${oldStatus}" to "${new_status}"`;
      await pool.query(
        `INSERT INTO ea_service_request_comments (
          request_id,
          comment_text,
          comment_type,
          is_status_change,
          old_status,
          new_status,
          created_by,
          is_visible_to_staff,
          created_at
        ) VALUES ($1, $2, 'status_change', true, $3, $4, $5, true, CURRENT_TIMESTAMP)`,
        [requestId, commentText, oldStatus, new_status, session.user.email]
      );

      // Commit transaction
      await pool.query('COMMIT');

      // Send email notification (async, don't wait)
      const baseUrl = config.appUrl;
      const statusLink = `${baseUrl}/admin/service-requests/${requestId}`;

      sendEmail({
        to: requestData.requester_email,
        subject: `Service Request ${requestData.request_number} - Status Updated`,
        html: getServiceRequestStatusChangeEmail(
          requestData.request_number,
          requestData.requester_name,
          requestData.service_name,
          oldStatus,
          new_status,
          comment || null,
          statusLink
        ),
      }).catch((error) => {
        console.error('Failed to send status change email:', error);
        // Don't fail the request if email fails
      });

      return NextResponse.json({
        success: true,
        data: {
          request_id: requestId,
          old_status: oldStatus,
          new_status: new_status,
          comment: commentText,
        },
        message: 'Status updated successfully. Email notification sent to requester.',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error changing status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to change status',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
