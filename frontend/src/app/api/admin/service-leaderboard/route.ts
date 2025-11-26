/**
 * GEA Portal - Service Leaderboard API
 *
 * GET /api/admin/service-leaderboard - Get service leaderboard statistics
 * Returns top 5 and bottom 5 services based on various metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pool } from '@/lib/db';
import { getEntityFilter } from '@/lib/entity-filter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const entityIdParam = searchParams.get('entity_id');

    // Apply entity filter for staff users - override entity_id parameter
    const entityFilter = getEntityFilter(session);
    const finalEntityId = entityFilter || entityIdParam;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (finalEntityId && finalEntityId.trim()) {
      // Handle multiple entity IDs (comma-separated)
      const entityIds = finalEntityId.split(',').filter(Boolean);
      if (entityIds.length > 0) {
        const placeholders = entityIds.map(() => `$${paramIndex++}`).join(',');
        conditions.push(`s.entity_id IN (${placeholders})`);
        params.push(...entityIds);
      }
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    // Query 1: Service statistics with feedback
    const serviceStatsQuery = `
      WITH service_feedback_stats AS (
        SELECT
          s.service_id,
          s.service_name,
          e.entity_name,
          e.unique_entity_id as entity_id,
          COUNT(DISTINCT f.feedback_id) as feedback_count,
          ROUND(AVG(f.q5_overall_satisfaction)::numeric, 2) as avg_satisfaction,
          COUNT(CASE WHEN f.grievance_flag = TRUE THEN 1 END) as grievance_count,
          ROUND(AVG(f.q1_ease)::numeric, 2) as avg_ease,
          ROUND(AVG(f.q2_clarity)::numeric, 2) as avg_clarity,
          ROUND(AVG(f.q3_timeliness)::numeric, 2) as avg_timeliness,
          ROUND(AVG(f.q4_trust)::numeric, 2) as avg_trust
        FROM service_master s
        JOIN entity_master e ON s.entity_id = e.unique_entity_id
        LEFT JOIN service_feedback f ON s.service_id = f.service_id
        ${whereClause}
        GROUP BY s.service_id, s.service_name, e.entity_name, e.unique_entity_id
        HAVING COUNT(DISTINCT f.feedback_id) > 0
      ),
      service_request_stats AS (
        SELECT
          sr.service_id,
          COUNT(*) as request_count,
          COUNT(*) FILTER (WHERE sr.status = 'completed') as completed_count,
          COUNT(*) FILTER (WHERE sr.status = 'rejected') as rejected_count,
          ROUND(
            (COUNT(*) FILTER (WHERE sr.status = 'completed')::numeric /
             NULLIF(COUNT(*)::numeric, 0) * 100),
            2
          ) as completion_rate
        FROM ea_service_requests sr
        ${whereClause.replace('s.entity_id', 'sr.entity_id')}
        GROUP BY sr.service_id
      )
      SELECT
        sf.service_id,
        sf.service_name,
        sf.entity_name,
        sf.entity_id,
        sf.feedback_count,
        sf.avg_satisfaction,
        sf.grievance_count,
        sf.avg_ease,
        sf.avg_clarity,
        sf.avg_timeliness,
        sf.avg_trust,
        COALESCE(sr.request_count, 0) as request_count,
        COALESCE(sr.completed_count, 0) as completed_count,
        COALESCE(sr.rejected_count, 0) as rejected_count,
        COALESCE(sr.completion_rate, 0) as completion_rate,
        -- Calculate overall score (weighted average) - Scale: 0-10
        -- Formula breakdown:
        --   1. Customer Satisfaction (40% weight): avg_satisfaction * 0.4 (max 2.0 points from 5.0 rating)
        --   2. Completion Rate (25% weight): completion_rate / 20 (max 5.0 points from 100% completion)
        --   3. Grievance Penalty (35% weight): 5 - (grievance_rate * 5) (max 5.0 points, reduced by grievance rate)
        --      where grievance_rate = grievance_count / feedback_count
        -- Total possible score: 2.0 + 5.0 + 5.0 = 12.0, but practically 0-10 range
        -- Higher scores indicate better service performance
        ROUND(
          (
            COALESCE(sf.avg_satisfaction, 0) * 0.4 +
            COALESCE(sr.completion_rate, 0) / 20 +
            (5 - COALESCE(sf.grievance_count::numeric / NULLIF(sf.feedback_count::numeric, 0) * 5, 0))
          )::numeric,
          2
        ) as overall_score
      FROM service_feedback_stats sf
      LEFT JOIN service_request_stats sr ON sf.service_id = sr.service_id
      ORDER BY overall_score DESC
    `;

    const serviceStatsResult = await pool.query(serviceStatsQuery, params);
    const allServices = serviceStatsResult.rows;

    // Get top 5 and bottom 5 services
    const top5Services = allServices.slice(0, 5);
    const bottom5Services = allServices.slice(-5).reverse();

    // Query 2: Top services by satisfaction rating
    const topBySatisfactionQuery = `
      SELECT
        s.service_id,
        s.service_name,
        e.entity_name,
        e.unique_entity_id as entity_id,
        COUNT(f.feedback_id) as feedback_count,
        ROUND(AVG(f.q5_overall_satisfaction)::numeric, 2) as avg_satisfaction
      FROM service_master s
      JOIN entity_master e ON s.entity_id = e.unique_entity_id
      INNER JOIN service_feedback f ON s.service_id = f.service_id
      ${whereClause}
      GROUP BY s.service_id, s.service_name, e.entity_name, e.unique_entity_id
      HAVING COUNT(f.feedback_id) > 0
      ORDER BY avg_satisfaction DESC, feedback_count DESC
      LIMIT 5
    `;

    const topBySatisfaction = await pool.query(topBySatisfactionQuery, params);

    // Query 3: Services with most requests
    const topByRequestsQuery = `
      SELECT
        s.service_id,
        s.service_name,
        e.entity_name,
        e.unique_entity_id as entity_id,
        COUNT(sr.request_id) as request_count,
        COUNT(*) FILTER (WHERE sr.status = 'completed') as completed_count,
        ROUND(
          (COUNT(*) FILTER (WHERE sr.status = 'completed')::numeric /
           NULLIF(COUNT(*)::numeric, 0) * 100),
          2
        ) as completion_rate
      FROM service_master s
      JOIN entity_master e ON s.entity_id = e.unique_entity_id
      LEFT JOIN ea_service_requests sr ON s.service_id = sr.service_id
      ${whereClause}
      GROUP BY s.service_id, s.service_name, e.entity_name, e.unique_entity_id
      HAVING COUNT(sr.request_id) > 0
      ORDER BY request_count DESC
      LIMIT 5
    `;

    const topByRequests = await pool.query(topByRequestsQuery, params);

    // Query 4: Services with most grievances (needs attention)
    const topByGrievancesQuery = `
      SELECT
        s.service_id,
        s.service_name,
        e.entity_name,
        e.unique_entity_id as entity_id,
        COUNT(f.feedback_id) as feedback_count,
        COUNT(CASE WHEN f.grievance_flag = TRUE THEN 1 END) as grievance_count,
        ROUND(AVG(f.q5_overall_satisfaction)::numeric, 2) as avg_satisfaction,
        ROUND(
          (COUNT(CASE WHEN f.grievance_flag = TRUE THEN 1 END)::numeric /
           NULLIF(COUNT(f.feedback_id)::numeric, 0) * 100),
          2
        ) as grievance_rate
      FROM service_master s
      JOIN entity_master e ON s.entity_id = e.unique_entity_id
      LEFT JOIN service_feedback f ON s.service_id = f.service_id
      ${whereClause}
      GROUP BY s.service_id, s.service_name, e.entity_name, e.unique_entity_id
      HAVING COUNT(CASE WHEN f.grievance_flag = TRUE THEN 1 END) > 0
      ORDER BY grievance_count DESC
      LIMIT 5
    `;

    const topByGrievances = await pool.query(topByGrievancesQuery, params);

    // Compile response
    const response = {
      filters: {
        entity_id: finalEntityId,
      },
      overall: {
        top_5: top5Services,
        bottom_5: bottom5Services,
      },
      by_satisfaction: topBySatisfaction.rows,
      by_requests: topByRequests.rows,
      needs_attention: topByGrievances.rows,
      total_services: allServices.length,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Service leaderboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve service leaderboard' },
      { status: 500 }
    );
  }
}
