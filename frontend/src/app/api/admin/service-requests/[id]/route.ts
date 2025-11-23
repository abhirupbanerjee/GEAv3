/**
 * GEA Portal - Service Request Detail API
 *
 * GET /api/admin/service-requests/[id] - Get request details
 * PUT /api/admin/service-requests/[id] - Update request
 * DELETE /api/admin/service-requests/[id] - Delete request
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
 * GET /api/admin/service-requests/[id]
 * Get service request details
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

    // Fetch request with related data
    const query = `
      SELECT
        r.request_id,
        r.request_number,
        r.service_id,
        s.service_name,
        r.entity_id,
        e.entity_name,
        r.status,
        r.requester_name,
        r.requester_email,
        r.requester_phone,
        r.requester_ministry,
        r.request_description,
        r.assigned_to,
        r.created_at,
        r.updated_at,
        r.resolved_at,
        r.closed_at,
        r.created_by,
        r.updated_by
      FROM ea_service_requests r
      JOIN service_master s ON r.service_id = s.service_id
      JOIN entity_master e ON r.entity_id = e.unique_entity_id
      WHERE r.request_id = $1
    `;

    const result = await pool.query(query, [requestId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Service request not found' },
        { status: 404 }
      );
    }

    const requestData = result.rows[0];

    // Validate entity access for staff users
    if (!validateEntityAccess(session, requestData.entity_id)) {
      return NextResponse.json(
        { error: 'Forbidden - You can only access requests from your assigned entity' },
        { status: 403 }
      );
    }

    // Fetch attachments
    const attachmentsQuery = `
      SELECT
        attachment_id,
        filename,
        mimetype,
        file_size,
        is_mandatory,
        uploaded_by,
        created_at
      FROM ea_service_request_attachments
      WHERE request_id = $1
      ORDER BY created_at DESC
    `;

    const attachmentsResult = await pool.query(attachmentsQuery, [requestId]);

    return NextResponse.json({
      success: true,
      data: {
        request: requestData,
        attachments: attachmentsResult.rows,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching service request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch service request',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/service-requests/[id]
 * Update service request
 */
export async function PUT(
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

    // First, get current request to validate access
    const checkQuery = `SELECT entity_id FROM ea_service_requests WHERE request_id = $1`;
    const checkResult = await pool.query(checkQuery, [requestId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Service request not found' },
        { status: 404 }
      );
    }

    // Validate entity access for staff users
    if (!validateEntityAccess(session, checkResult.rows[0].entity_id)) {
      return NextResponse.json(
        { error: 'Forbidden - You can only update requests from your assigned entity' },
        { status: 403 }
      );
    }

    // Build dynamic UPDATE query
    const allowedFields = ['status', 'assigned_to', 'request_description'];
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(body[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Add updated_by and updated_at
    updateFields.push(`updated_by = $${paramIndex}`);
    updateValues.push(session.user.email);
    paramIndex++;

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add request_id for WHERE clause
    updateValues.push(requestId);

    const updateQuery = `
      UPDATE ea_service_requests
      SET ${updateFields.join(', ')}
      WHERE request_id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);

    return NextResponse.json({
      success: true,
      data: {
        request: result.rows[0],
      },
      message: 'Service request updated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating service request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update service request',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/service-requests/[id]
 * Delete service request (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete requests
    if (session.user.roleType !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Only administrators can delete service requests' },
        { status: 403 }
      );
    }

    const requestId = params.id;

    // Delete request (attachments will be cascade deleted)
    const result = await pool.query(
      'DELETE FROM ea_service_requests WHERE request_id = $1 RETURNING request_number',
      [requestId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Service request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Service request ${result.rows[0].request_number} deleted successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error deleting service request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete service request',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
