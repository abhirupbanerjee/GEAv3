/**
 * GEA Portal - Service Requests Analytics API
 *
 * GET /api/admin/service-requests/analytics - Get analytics data for charts
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
 * GET /api/admin/service-requests/analytics
 * Get comprehensive analytics data for service requests
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply entity filter for staff users
    const entityFilter = getEntityFilter(session);

    const whereClauses: string[] = [];
    const queryParams: any[] = [];

    if (entityFilter) {
      whereClauses.push('entity_id = $1');
      queryParams.push(entityFilter);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 1. Requests by status
    const statusQuery = `
      SELECT
        status,
        COUNT(*) as count
      FROM ea_service_requests
      ${whereClause}
      GROUP BY status
      ORDER BY count DESC
    `;
    const statusResult = await pool.query(statusQuery, queryParams);

    // 2. Requests by month (last 12 months)
    const monthlyQuery = `
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM ea_service_requests
      ${whereClause}
        ${whereClause ? 'AND' : 'WHERE'} created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `;
    const monthlyResult = await pool.query(monthlyQuery, queryParams);

    // 3. Requests by service
    const serviceQuery = `
      SELECT
        s.service_name,
        COUNT(r.request_id) as count
      FROM ea_service_requests r
      JOIN service_master s ON r.service_id = s.service_id
      ${whereClause}
      GROUP BY s.service_name
      ORDER BY count DESC
      LIMIT 10
    `;
    const serviceResult = await pool.query(serviceQuery, queryParams);

    // 4. Requests by entity (admin only)
    let entityResult = { rows: [] };
    if (!entityFilter) {
      const entityQuery = `
        SELECT
          e.entity_name,
          COUNT(r.request_id) as count
        FROM ea_service_requests r
        JOIN entity_master e ON r.entity_id = e.unique_entity_id
        GROUP BY e.entity_name
        ORDER BY count DESC
        LIMIT 10
      `;
      entityResult = await pool.query(entityQuery);
    }

    // 5. Average processing time by status
    const processingTimeQuery = `
      SELECT
        status,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) as avg_days
      FROM ea_service_requests
      ${whereClause}
        ${whereClause ? 'AND' : 'WHERE'} updated_at IS NOT NULL
      GROUP BY status
    `;
    const processingTimeResult = await pool.query(processingTimeQuery, queryParams);

    // 6. Completion rate
    const completionQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status != 'completed') as in_progress,
        COUNT(*) as total
      FROM ea_service_requests
      ${whereClause}
    `;
    const completionResult = await pool.query(completionQuery, queryParams);
    const completionData = completionResult.rows[0];
    const completionRate =
      completionData.total > 0
        ? ((completionData.completed / completionData.total) * 100).toFixed(1)
        : 0;

    // 7. Weekly trend (last 8 weeks)
    const weeklyQuery = `
      SELECT
        TO_CHAR(created_at, 'YYYY-WW') as week,
        COUNT(*) as count
      FROM ea_service_requests
      ${whereClause}
        ${whereClause ? 'AND' : 'WHERE'} created_at >= CURRENT_DATE - INTERVAL '8 weeks'
      GROUP BY TO_CHAR(created_at, 'YYYY-WW')
      ORDER BY week ASC
    `;
    const weeklyResult = await pool.query(weeklyQuery, queryParams);

    return NextResponse.json({
      success: true,
      data: {
        status_distribution: statusResult.rows,
        monthly_trend: monthlyResult.rows,
        top_services: serviceResult.rows,
        entity_distribution: entityResult.rows,
        average_processing_time: processingTimeResult.rows,
        completion_rate: parseFloat(completionRate),
        completion_stats: {
          completed: parseInt(completionData.completed),
          in_progress: parseInt(completionData.in_progress),
          total: parseInt(completionData.total),
        },
        weekly_trend: weeklyResult.rows,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
