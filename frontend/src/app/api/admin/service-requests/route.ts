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
import { sendEmail, sendBulkEmail } from '@/lib/sendgrid';
import {
  getEAServiceRequestEmail,
  getDTAServiceRequestNotificationEmail,
} from '@/lib/emailTemplates';
import {
  getServiceRequestEntityId,
  getDTAAdminRoleCode,
} from '@/lib/settings';
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
 * Send email notifications for new service request
 * Non-blocking operation - logs errors but doesn't fail request
 */
async function sendServiceRequestNotifications(
  requestData: {
    request_number: string;
    requester_name: string;
    requester_email: string;
    requester_ministry: string | null;
    service_id: string;
    entity_id: string;
    request_description: string | null;
  }
): Promise<void> {
  try {
    // Fetch service name and entity name for email
    const serviceInfo = await pool.query(
      `SELECT s.service_name, e.entity_name
       FROM service_master s
       JOIN entity_master e ON s.entity_id = e.unique_entity_id
       WHERE s.service_id = $1`,
      [requestData.service_id]
    );

    if (serviceInfo.rows.length === 0) {
      console.error('❌ Service not found for email notifications');
      return;
    }

    const { service_name, entity_name } = serviceInfo.rows[0];
    const baseUrl = config.appUrl;
    const statusLink = `${baseUrl}/admin/service-requests?search=${requestData.request_number}`;

    // 1. Send confirmation email to requester
    try {
      await sendEmail({
        to: requestData.requester_email,
        subject: `Service Request Submitted - ${requestData.request_number}`,
        html: getEAServiceRequestEmail(
          requestData.request_number,
          service_name,
          requestData.requester_name,
          statusLink
        ),
      });
      console.log(`✅ Confirmation email sent to ${requestData.requester_email}`);
    } catch (error) {
      console.error('❌ Failed to send confirmation email (non-critical):', error);
    }

    // 2. Send notification to DTA administrators only
    try {
      // Query DTA admins only (admin_dta role with DTA entity)
      const dtaEntityId = await getServiceRequestEntityId();
      const dtaRoleCode = await getDTAAdminRoleCode();

      const dtaAdmins = await pool.query(
        `SELECT DISTINCT u.email
         FROM users u
         JOIN user_roles r ON u.role_id = r.role_id
         WHERE u.entity_id = $1
           AND r.role_code = $2
           AND u.is_active = TRUE
           AND u.email IS NOT NULL
         ORDER BY u.email`,
        [dtaEntityId, dtaRoleCode]
      );

      if (dtaAdmins.rows.length === 0) {
        console.warn('⚠️  No active DTA administrators found for notification');
        return;
      }

      const adminEmails = dtaAdmins.rows.map((row) => row.email);
      console.log(`📧 Sending notifications to ${adminEmails.length} DTA administrators`);

      // Use bulk email for efficiency
      await sendBulkEmail(
        adminEmails,
        `New EA Service Request - ${requestData.request_number}`,
        getDTAServiceRequestNotificationEmail(
          requestData.request_number,
          service_name,
          requestData.requester_name,
          requestData.requester_email,
          requestData.requester_ministry,
          entity_name,
          requestData.request_description,
          statusLink
        )
      );

      console.log(
        `✅ DTA admin notification emails sent to ${adminEmails.length} recipients`
      );
    } catch (error) {
      console.error('❌ Failed to send DTA notification emails (non-critical):', error);
    }
  } catch (error) {
    console.error('❌ Email notification handler error (non-critical):', error);
  }
}

/**
 * GET /api/admin/service-requests
 * List service requests with optional filters
 *
 * Query params:
 *   - view: 'submitted' | 'received' | 'all'
 *     - submitted: Requests this entity submitted to other providers
 *     - received: Requests other entities submitted TO this entity's services
 *     - all: Both (admin only)
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
    const entityIdParam = searchParams.get('entity_id');
    const viewParam = searchParams.get('view') || 'submitted'; // Default to submitted view

    // Parse filters
    const statusFilter = searchParams.get('status');
    const serviceFilter = searchParams.get('service_id');
    const searchQuery = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    // Check if user's entity is a service provider (for received view access)
    let isServiceProvider = false;
    if (session.user.entityId) {
      const providerCheck = await pool.query(
        'SELECT is_service_provider FROM entity_master WHERE unique_entity_id = $1',
        [session.user.entityId]
      );
      isServiceProvider = providerCheck.rows[0]?.is_service_provider === true;
    }

    // Build WHERE clause
    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Handle view-based filtering for staff users
    if (session.user.roleType === 'staff' && session.user.entityId) {
      if (viewParam === 'received') {
        // For received view, filter by service provider entity (via service_master)
        // Only allow if user's entity is a service provider
        if (!isServiceProvider) {
          return NextResponse.json({
            success: true,
            data: {
              requests: [],
              pagination: { page, limit, total_count: 0, total_pages: 0, has_next: false, has_prev: false },
              filters: { view: viewParam, status: statusFilter, service_id: serviceFilter, search: searchQuery },
              is_service_provider: false,
            },
            message: 'Your entity is not configured as a service provider',
            timestamp: new Date().toISOString(),
          });
        }
        whereClauses.push(`s.entity_id = $${paramIndex}`);
        queryParams.push(session.user.entityId);
        paramIndex++;
      } else {
        // Default: submitted view - filter by requesting entity
        whereClauses.push(`r.entity_id = $${paramIndex}`);
        queryParams.push(session.user.entityId);
        paramIndex++;
      }
    } else if (session.user.roleType === 'admin') {
      // Admin can filter by entity_id param or view all
      const finalEntityId = entityIdParam;
      if (finalEntityId) {
        // Handle multiple entity IDs (comma-separated)
        const entityIds = finalEntityId.split(',').filter(Boolean);
        if (entityIds.length > 0) {
          const placeholders = entityIds.map(() => `$${paramIndex++}`).join(',');
          whereClauses.push(`r.entity_id IN (${placeholders})`);
          queryParams.push(...entityIds);
        }
      }
    } else {
      // Fallback for other cases
      const finalEntityId = entityFilter || entityIdParam;
      if (finalEntityId) {
        const entityIds = finalEntityId.split(',').filter(Boolean);
        if (entityIds.length > 0) {
          const placeholders = entityIds.map(() => `$${paramIndex++}`).join(',');
          whereClauses.push(`r.entity_id IN (${placeholders})`);
          queryParams.push(...entityIds);
        }
      }
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

    // Get total count (need to join service_master for received view filtering)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ea_service_requests r
      JOIN service_master s ON r.service_id = s.service_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0]?.total || '0');

    // Get paginated requests
    // Include service provider entity info for context
    const requestsQuery = `
      SELECT
        r.request_id,
        r.request_number,
        r.service_id,
        s.service_name,
        s.entity_id as service_provider_entity_id,
        pe.entity_name as service_provider_entity_name,
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
      JOIN entity_master pe ON s.entity_id = pe.unique_entity_id
      LEFT JOIN ea_service_request_attachments a ON r.request_id = a.request_id
      ${whereClause}
      GROUP BY r.request_id, s.service_name, s.entity_id, pe.entity_name, e.entity_name
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
          view: viewParam,
          status: statusFilter,
          service_id: serviceFilter,
          search: searchQuery,
          entity_id: entityFilter,
        },
        is_service_provider: isServiceProvider,
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
        '.zip': ['application/zip', 'application/x-zip-compressed'],
      };

      for (const key of attachmentKeys) {
        const file = formData.get(key) as File;
        if (!file) continue;

        const attachmentId = parseInt(key.replace('attachment_', ''));

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          await pool.query('ROLLBACK');
          return NextResponse.json(
            { error: `File ${file.name} exceeds 10MB limit` },
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

      // Send email notifications (non-blocking, after successful commit)
      // Don't await - let it run in background
      sendServiceRequestNotifications({
        request_number: requestNumber,
        requester_name: requester_name,
        requester_email: requester_email,
        requester_ministry: requester_ministry || null,
        service_id: service_id,
        entity_id: entity_id,
        request_description: request_description || null,
      }).catch((error) => {
        console.error('Email notification failed (non-critical):', error);
      });

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
