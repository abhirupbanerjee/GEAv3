/**
 * GEA Portal - External Tickets API
 *
 * GET /api/external/tickets
 *
 * Query individual ticket records with filtering.
 * Requires X-API-Key header for authentication.
 *
 * Query Parameters:
 *   - status: Filter by status code (open, in_progress, pending, resolved, closed)
 *   - priority: Filter by priority (low, medium, high, urgent)
 *   - entity_id: Filter by entity ID
 *   - entity_name: Fuzzy search by entity name (ILIKE)
 *   - overdue: Filter overdue tickets (true/false)
 *   - limit: Maximum records to return (default 50, max 100)
 *   - offset: Pagination offset (default 0)
 *
 * Example:
 *   GET /api/external/tickets?status=open&priority=high&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/apiKeyAuth';
import { pool } from '@/lib/db';
import { maskName, maskEmail, maskPhone } from '@/lib/piiMask';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export async function GET(request: NextRequest) {
  try {
    // API Key validation
    const authError = validateApiKey(request);
    if (authError) return authError;

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const entityId = searchParams.get('entity_id');
    const entityName = searchParams.get('entity_name');
    const overdueParam = searchParams.get('overdue');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

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
      conditions.push(`ts.status_code = $${paramIndex++}`);
      params.push(status.toLowerCase());
    }

    if (priority) {
      conditions.push(`pl.priority_code = $${paramIndex++}`);
      params.push(priority.toUpperCase());
    }

    if (entityId) {
      conditions.push(`t.assigned_entity_id = $${paramIndex++}`);
      params.push(entityId);
    }

    if (entityName) {
      conditions.push(`e.entity_name ILIKE $${paramIndex++}`);
      params.push(`%${entityName}%`);
    }

    if (overdueParam === 'true') {
      conditions.push(`t.sla_resolution_target < NOW()`);
      conditions.push(`ts.is_terminal = false`);
    }

    const whereClause =
      conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Get total count
    const countResult = await pool.query(
      `
      SELECT COUNT(*) as total
      FROM tickets t
      LEFT JOIN ticket_status ts ON t.status_id = ts.status_id
      LEFT JOIN priority_levels pl ON t.priority_id = pl.priority_id
      LEFT JOIN entity_master e ON t.assigned_entity_id = e.unique_entity_id
      ${whereClause}
    `,
      params
    );

    const total = parseInt(countResult.rows[0]?.total || '0');

    // Get ticket records
    const result = await pool.query(
      `
      SELECT
        t.ticket_number,
        t.subject,
        ts.status_name as status,
        ts.status_code,
        ts.color_code as status_color,
        pl.priority_name as priority,
        pl.priority_code,
        pl.color_code as priority_color,
        t.requester_category,
        t.contact_name,
        t.contact_email,
        t.contact_phone,
        t.sla_response_target,
        t.sla_resolution_target,
        t.first_response_at,
        t.resolved_at,
        t.created_at,
        t.updated_at,
        e.entity_name,
        e.unique_entity_id as entity_id,
        CASE
          WHEN ts.is_terminal = true THEN 'completed'
          WHEN t.sla_resolution_target < NOW() THEN 'overdue'
          WHEN t.sla_resolution_target < NOW() + INTERVAL '24 hours' THEN 'at_risk'
          ELSE 'on_track'
        END as sla_status
      FROM tickets t
      LEFT JOIN ticket_status ts ON t.status_id = ts.status_id
      LEFT JOIN priority_levels pl ON t.priority_id = pl.priority_id
      LEFT JOIN entity_master e ON t.assigned_entity_id = e.unique_entity_id
      ${whereClause}
      ORDER BY
        CASE WHEN t.sla_resolution_target < NOW() AND ts.is_terminal = false THEN 0 ELSE 1 END,
        t.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `,
      [...params, limit, offset]
    );

    // Mask PII in results
    const tickets = result.rows.map(row => ({
      ticket_number: row.ticket_number,
      subject: row.subject,
      status: {
        name: row.status,
        code: row.status_code,
        color: row.status_color,
      },
      priority: {
        name: row.priority,
        code: row.priority_code,
        color: row.priority_color,
      },
      requester_category: row.requester_category,
      contact_name: maskName(row.contact_name),
      contact_email: maskEmail(row.contact_email),
      contact_phone: maskPhone(row.contact_phone),
      sla: {
        response_target: row.sla_response_target,
        resolution_target: row.sla_resolution_target,
        first_response_at: row.first_response_at,
        resolved_at: row.resolved_at,
        status: row.sla_status,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
      entity: row.entity_id
        ? {
            id: row.entity_id,
            name: row.entity_name,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: tickets,
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + tickets.length < total,
      },
      meta: {
        filters: {
          status: status || null,
          priority: priority || null,
          entity_id: entityId || null,
          entity_name: entityName || null,
          overdue: overdueParam === 'true' || null,
        },
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[EXTERNAL API] Tickets error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
