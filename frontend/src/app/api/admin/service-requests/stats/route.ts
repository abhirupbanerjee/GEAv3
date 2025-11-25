/**
 * GEA Portal - Service Requests Statistics API
 *
 * GET /api/admin/service-requests/stats - Get service request statistics
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

    // Apply entity filter for staff users
    const entityFilter = getEntityFilter(session);
    const finalEntityId = entityFilter || entityIdParam;

    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (finalEntityId) {
      // Handle multiple entity IDs (comma-separated)
      const entityIds = finalEntityId.split(',').filter(Boolean);
      if (entityIds.length > 0) {
        const placeholders = entityIds.map(() => `$${paramIndex++}`).join(',');
        whereClauses.push(`entity_id IN (${placeholders})`);
        queryParams.push(...entityIds);
      }
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get status counts
    const statsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'submitted') as submitted,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'under_review') as under_review,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as last_7_days,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as last_30_days
      FROM ea_service_requests
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
        r.created_at
      FROM ea_service_requests r
      JOIN service_master s ON r.service_id = s.service_id
      JOIN entity_master e ON r.entity_id = e.unique_entity_id
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
