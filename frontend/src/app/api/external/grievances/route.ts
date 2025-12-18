/**
 * GEA Portal - External Grievances API
 *
 * GET /api/external/grievances
 *
 * Query individual grievance records with filtering.
 * Requires X-API-Key header for authentication.
 *
 * Query Parameters:
 *   - status: Filter by status (open, in_progress, resolved, closed)
 *   - entity_id: Filter by entity ID
 *   - entity_name: Fuzzy search by entity name (ILIKE)
 *   - service_id: Filter by service ID
 *   - service_name: Fuzzy search by service name (ILIKE)
 *   - limit: Maximum records to return (default 50, max 100)
 *   - offset: Pagination offset (default 0)
 *
 * Example:
 *   GET /api/external/grievances?status=open&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/apiKeyAuth';
import { pool } from '@/lib/db';
import { maskName, maskEmail, maskPhone } from '@/lib/piiMask';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

export async function GET(request: NextRequest) {
  try {
    // API Key validation
    const authError = validateApiKey(request);
    if (authError) return authError;

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const status = searchParams.get('status');
    const entityId = searchParams.get('entity_id');
    const entityName = searchParams.get('entity_name');
    const serviceId = searchParams.get('service_id');
    const serviceName = searchParams.get('service_name');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // Validate status
    if (status && !VALID_STATUSES.includes(status.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Valid options: ${VALID_STATUSES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Parse pagination
    const limit = Math.min(
      Math.max(1, parseInt(limitParam || '') || DEFAULT_LIMIT),
      MAX_LIMIT
    );
    const offset = Math.max(0, parseInt(offsetParam || '') || 0);

    // Build query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`g.status = $${paramIndex++}`);
      params.push(status.toLowerCase());
    }

    if (entityId) {
      conditions.push(`g.entity_id = $${paramIndex++}`);
      params.push(entityId);
    }

    if (entityName) {
      conditions.push(`e.entity_name ILIKE $${paramIndex++}`);
      params.push(`%${entityName}%`);
    }

    if (serviceId) {
      conditions.push(`g.service_id = $${paramIndex++}`);
      params.push(serviceId);
    }

    if (serviceName) {
      conditions.push(`s.service_name ILIKE $${paramIndex++}`);
      params.push(`%${serviceName}%`);
    }

    const whereClause =
      conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Get total count
    const countResult = await pool.query(
      `
      SELECT COUNT(*) as total
      FROM grievance_tickets g
      JOIN entity_master e ON g.entity_id = e.unique_entity_id
      JOIN service_master s ON g.service_id = s.service_id
      ${whereClause}
    `,
      params
    );

    const total = parseInt(countResult.rows[0]?.total || '0');

    // Get grievance records
    const result = await pool.query(
      `
      SELECT
        g.grievance_number,
        g.grievance_subject as subject,
        g.status,
        g.submitter_category,
        g.submitter_name,
        g.submitter_email,
        g.submitter_phone,
        g.incident_date,
        g.assigned_to,
        g.created_at,
        g.updated_at,
        g.resolved_at,
        g.closed_at,
        e.entity_name,
        e.unique_entity_id as entity_id,
        s.service_name,
        s.service_id
      FROM grievance_tickets g
      JOIN entity_master e ON g.entity_id = e.unique_entity_id
      JOIN service_master s ON g.service_id = s.service_id
      ${whereClause}
      ORDER BY g.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `,
      [...params, limit, offset]
    );

    // Mask PII in results
    const grievances = result.rows.map(row => ({
      grievance_number: row.grievance_number,
      subject: row.subject,
      status: row.status,
      submitter_category: row.submitter_category,
      submitter_name: maskName(row.submitter_name),
      submitter_email: maskEmail(row.submitter_email),
      submitter_phone: maskPhone(row.submitter_phone),
      incident_date: row.incident_date,
      assigned_to: row.assigned_to,
      created_at: row.created_at,
      updated_at: row.updated_at,
      resolved_at: row.resolved_at,
      closed_at: row.closed_at,
      entity: {
        id: row.entity_id,
        name: row.entity_name,
      },
      service: {
        id: row.service_id,
        name: row.service_name,
      },
    }));

    return NextResponse.json({
      success: true,
      data: grievances,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + grievances.length < total,
      },
      meta: {
        filters: {
          status: status || null,
          entity_id: entityId || null,
          entity_name: entityName || null,
          service_id: serviceId || null,
          service_name: serviceName || null,
        },
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[EXTERNAL API] Grievances error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
