/**
 * GEA Portal - Admin Service Requests API
 *
 * GET /api/admin/service-requests - List service requests with filters
 * POST /api/admin/service-requests - Create new service request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Pool } from 'pg';
import { getEntityFilter } from '@/lib/entity-filter';

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
 * GET /api/admin/service-requests
 * List service requests with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Apply entity filter for staff users
    const entityFilter = getEntityFilter(session);

    // Parse filters
    const statusFilter = searchParams.get('status');
    const serviceFilter = searchParams.get('service_id');
    const searchQuery = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Entity filter (mandatory for staff)
    if (entityFilter) {
      whereClauses.push(`r.entity_id = $${paramIndex}`);
      queryParams.push(entityFilter);
      paramIndex++;
    }

    // Status filter
    if (statusFilter) {
      whereClauses.push(`r.status = $${paramIndex}`);
      queryParams.push(statusFilter);
      paramIndex++;
    }

    // Service filter
    if (serviceFilter) {
      whereClauses.push(`r.service_id = $${paramIndex}`);
      queryParams.push(serviceFilter);
      paramIndex++;
    }

    // Search filter
    if (searchQuery) {
      whereClauses.push(`(
        r.request_number ILIKE $${paramIndex} OR
        r.requester_name ILIKE $${paramIndex} OR
        r.requester_email ILIKE $${paramIndex} OR
        r.request_description ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${searchQuery}%`);
      paramIndex++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ea_service_requests r
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0]?.total || '0');

    // Get paginated requests
    const requestsQuery = `
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
        r.created_at,
        r.updated_at,
        r.resolved_at,
        r.closed_at,
        r.created_by,
        COUNT(a.attachment_id) as attachment_count
      FROM ea_service_requests r
      JOIN service_master s ON r.service_id = s.service_id
      JOIN entity_master e ON r.entity_id = e.unique_entity_id
      LEFT JOIN ea_service_request_attachments a ON r.request_id = a.request_id
      ${whereClause}
      GROUP BY r.request_id, s.service_name, e.entity_name
      ORDER BY r.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const requestsResult = await pool.query(requestsQuery, queryParams);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        requests: requestsResult.rows,
        pagination: {
          page,
          limit,
          total_count: totalCount,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1,
        },
        filters: {
          status: statusFilter,
          service_id: serviceFilter,
          search: searchQuery,
          entity_id: entityFilter, // Show applied entity filter
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching service requests:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch service requests',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/service-requests
 * Create new service request with file attachments
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await request.formData();

    const service_id = formData.get('service_id') as string;
    const entity_id = formData.get('entity_id') as string;
    const requester_name = formData.get('requester_name') as string;
    const requester_email = formData.get('requester_email') as string;
    const requester_phone = formData.get('requester_phone') as string;
    const requester_ministry = formData.get('requester_ministry') as string;
    const request_description = formData.get('request_description') as string;
    const priority = formData.get('priority') as string;

    // Validate required fields
    if (!service_id || !entity_id || !requester_name || !requester_email) {
      return NextResponse.json(
        { error: 'Missing required fields: service_id, entity_id, requester_name, requester_email' },
        { status: 400 }
      );
    }

    // For staff users, enforce entity restriction
    if (session.user.roleType === 'staff' && entity_id !== session.user.entityId) {
      return NextResponse.json(
        { error: 'Forbidden - You can only create requests for your assigned entity' },
        { status: 403 }
      );
    }

    // Generate request number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM ea_service_requests
       WHERE created_at >= date_trunc('month', CURRENT_DATE)`
    );

    const count = parseInt(countResult.rows[0].count) + 1;
    const requestNumber = `SR-${year}${month}-${String(count).padStart(4, '0')}`;

    // Begin transaction
    await pool.query('BEGIN');

    try {
      // Insert request
      const result = await pool.query(
        `INSERT INTO ea_service_requests (
          request_number,
          service_id,
          entity_id,
          requester_name,
          requester_email,
          requester_phone,
          requester_ministry,
          request_description,
          status,
          created_by,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'submitted', $9, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          requestNumber,
          service_id,
          entity_id,
          requester_name,
          requester_email,
          requester_phone || null,
          requester_ministry || null,
          request_description || null,
          session.user.email,
        ]
      );

      const requestId = result.rows[0].request_id;

      // Process file attachments with validation
      const attachmentKeys = Array.from(formData.keys()).filter((key) => key.startsWith('attachment_'));
      let uploadedCount = 0;

      // MIME type mapping for validation
      const mimeTypeMap: Record<string, string[]> = {
        '.pdf': ['application/pdf'],
        '.doc': ['application/msword'],
        '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        '.xls': ['application/vnd.ms-excel'],
        '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        '.jpg': ['image/jpeg'],
        '.jpeg': ['image/jpeg'],
        '.png': ['image/png'],
        '.gif': ['image/gif'],
      };

      for (const key of attachmentKeys) {
        const file = formData.get(key) as File;
        if (!file) continue;

        const attachmentId = parseInt(key.replace('attachment_', ''));

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          await pool.query('ROLLBACK');
          return NextResponse.json(
            { error: `File ${file.name} exceeds 5MB limit` },
            { status: 400 }
          );
        }

        // Fetch attachment requirements for validation
        const attachmentReq = await pool.query(
          `SELECT file_extension, is_mandatory, filename
           FROM service_attachments
           WHERE service_attachment_id = $1 AND service_id = $2 AND is_active = true`,
          [attachmentId, service_id]
        );

        if (attachmentReq.rows.length === 0) {
          await pool.query('ROLLBACK');
          return NextResponse.json(
            { error: `Invalid attachment ID: ${attachmentId}` },
            { status: 400 }
          );
        }

        const requirement = attachmentReq.rows[0];

        // Validate file extension
        // Extract extension without dot (e.g., 'pdf' not '.pdf')
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
        const allowedExtensions = requirement.file_extension
          .split(',')
          .map((ext: string) => ext.trim().toLowerCase());

        console.log('[File Validation]', {
          fileName: file.name,
          fileExt,
          allowedExtensions,
          requirement: requirement.file_extension,
        });

        if (!allowedExtensions.includes(fileExt)) {
          await pool.query('ROLLBACK');
          return NextResponse.json(
            {
              error: `File ${file.name} has invalid extension. Allowed: ${allowedExtensions.join(', ')}`,
            },
            { status: 400 }
          );
        }

        // Validate MIME type matches extension (MIME map uses extension with dot)
        const fileExtWithDot = '.' + fileExt;
        const expectedMimes = mimeTypeMap[fileExtWithDot] || [];
        if (expectedMimes.length > 0 && !expectedMimes.includes(file.type)) {
          await pool.query('ROLLBACK');
          return NextResponse.json(
            { error: `File ${file.name} MIME type mismatch` },
            { status: 400 }
          );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Insert attachment
        await pool.query(
          `INSERT INTO ea_service_request_attachments (
            request_id,
            filename,
            mimetype,
            file_size,
            file_content,
            is_mandatory,
            uploaded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            requestId,
            file.name,
            file.type,
            file.size,
            buffer,
            requirement.is_mandatory,
            session.user.email,
          ]
        );

        uploadedCount++;
      }

      // Validate all mandatory attachments are uploaded
      // Count mandatory requirements vs uploaded mandatory files
      const mandatoryReqCount = await pool.query(
        `SELECT COUNT(*) as count
         FROM service_attachments sa
         WHERE sa.service_id = $1 AND sa.is_mandatory = true AND sa.is_active = true`,
        [service_id]
      );

      const mandatoryUploadCount = await pool.query(
        `SELECT COUNT(*) as count
         FROM ea_service_request_attachments sra
         WHERE sra.request_id = $1 AND sra.is_mandatory = true`,
        [requestId]
      );

      const requiredCount = parseInt(mandatoryReqCount.rows[0].count);
      const mandatoryUploaded = parseInt(mandatoryUploadCount.rows[0].count);

      if (mandatoryUploaded < requiredCount) {
        await pool.query('ROLLBACK');
        return NextResponse.json(
          {
            error: `Missing mandatory attachments. Required: ${requiredCount}, Uploaded: ${mandatoryUploaded}`,
            details: 'Please ensure all mandatory documents are uploaded'
          },
          { status: 400 }
        );
      }

      // Commit transaction
      await pool.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: {
          request: result.rows[0],
          attachments_uploaded: uploadedCount,
        },
        message: 'Service request created successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating service request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create service request',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
