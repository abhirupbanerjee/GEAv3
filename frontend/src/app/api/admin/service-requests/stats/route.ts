/**
 * GEA Portal - Service Requests Statistics API
 *
 * GET /api/admin/service-requests/stats - Get service request statistics
 * Query params:
 *   - view: 'submitted' | 'received' - filter by view type
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { getEntityFilter } from '@/lib/entity-filter';

/**
 * GET /api/admin/service-requests/stats
 * Dashboard statistics for service requests
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const entityIdParam = searchParams.get('entity_id');
    const viewParam = searchParams.get('view') || 'submitted';

    // Apply entity filter for staff users
    const entityFilter = getEntityFilter(session);

    // Check if user's entity is a service provider
    let isServiceProvider = false;
    if (session.user.entityId) {
      const providerCheck = await pool.query(
        'SELECT is_service_provider FROM entity_master WHERE unique_entity_id = $1',
        [session.user.entityId]
      );
      isServiceProvider = providerCheck.rows[0]?.is_service_provider === true;
    }

    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;
    let needsServiceJoin = false;

    // Handle view-based filtering for staff users
    if (session.user.roleType === 'staff' && session.user.entityId) {
      if (viewParam === 'received' && isServiceProvider) {
        // For received view, filter by service provider entity (via service_master)
        whereClauses.push(`s.entity_id = $${paramIndex}`);
        queryParams.push(session.user.entityId);
        paramIndex++;
        needsServiceJoin = true;
      } else {
        // Default: submitted view - filter by requesting entity
        whereClauses.push(`r.entity_id = $${paramIndex}`);
        queryParams.push(session.user.entityId);
        paramIndex++;
      }
    } else if (session.user.roleType === 'admin') {
      // Admin can filter by entity_id param (no default - allow viewing all entities)
      const finalEntityId = entityIdParam;
      if (finalEntityId) {
        const entityIds = finalEntityId.split(',').filter(Boolean);
        if (entityIds.length > 0) {
          const placeholders = entityIds.map(() => `$${paramIndex++}`).join(',');
          if (viewParam === 'received') {
            // Admin received view: filter by service provider entity
            whereClauses.push(`s.entity_id IN (${placeholders})`);
            needsServiceJoin = true;
          } else {
            // Admin submitted view: filter by requesting entity
            whereClauses.push(`r.entity_id IN (${placeholders})`);
          }
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
          if (viewParam === 'received') {
            // Received view: filter by service provider entity
            whereClauses.push(`s.entity_id IN (${placeholders})`);
            needsServiceJoin = true;
          } else {
            // Submitted view: filter by requesting entity
            whereClauses.push(`r.entity_id IN (${placeholders})`);
          }
          queryParams.push(...entityIds);
        }
      }
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const serviceJoin = needsServiceJoin ? 'JOIN service_master s ON r.service_id = s.service_id' : '';

    // Get status counts
    const statsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE r.status = 'submitted') as submitted,
        COUNT(*) FILTER (WHERE r.status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE r.status = 'under_review') as under_review,
        COUNT(*) FILTER (WHERE r.status = 'completed') as completed,
        COUNT(*) FILTER (WHERE r.status = 'rejected') as rejected,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE r.created_at >= CURRENT_DATE - INTERVAL '7 days') as last_7_days,
        COUNT(*) FILTER (WHERE r.created_at >= CURRENT_DATE - INTERVAL '30 days') as last_30_days
      FROM ea_service_requests r
      ${serviceJoin || 'JOIN service_master s ON r.service_id = s.service_id'}
      ${whereClause}
    `;

    const statsResult = await pool.query(statsQuery, queryParams);
    const stats = statsResult.rows[0];

    // Get recent requests
    const recentQuery = `
      SELECT
        r.request_number,
        r.requester_name,
        r.status,
        s.service_name,
        e.entity_name,
        pe.entity_name as provider_entity_name,
        r.created_at
      FROM ea_service_requests r
      JOIN service_master s ON r.service_id = s.service_id
      JOIN entity_master e ON r.entity_id = e.unique_entity_id
      JOIN entity_master pe ON s.entity_id = pe.unique_entity_id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT 5
    `;

    const recentResult = await pool.query(recentQuery, queryParams);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          submitted: parseInt(stats.submitted) || 0,
          in_progress: parseInt(stats.in_progress) || 0,
          under_review: parseInt(stats.under_review) || 0,
          completed: parseInt(stats.completed) || 0,
          rejected: parseInt(stats.rejected) || 0,
          total: parseInt(stats.total) || 0,
          last_7_days: parseInt(stats.last_7_days) || 0,
          last_30_days: parseInt(stats.last_30_days) || 0,
        },
        recent_requests: recentResult.rows,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching service request stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch statistics',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
