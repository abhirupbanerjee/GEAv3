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
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch configurable weights from settings
    const weightSettings = await getSettings([
      'LEADERBOARD_SATISFACTION_WEIGHT',
      'LEADERBOARD_TICKET_RESOLUTION_WEIGHT',
      'LEADERBOARD_GRIEVANCE_WEIGHT'
    ]);
    const satWeight = (Number(weightSettings.LEADERBOARD_SATISFACTION_WEIGHT) || 40) / 10;
    const ticketWeight = (Number(weightSettings.LEADERBOARD_TICKET_RESOLUTION_WEIGHT) || 25) / 10;
    const grievWeight = (Number(weightSettings.LEADERBOARD_GRIEVANCE_WEIGHT) || 35) / 10;

    const searchParams = request.nextUrl.searchParams;
    const entityIdParam = searchParams.get('entity_id');

    // Apply entity filter: staff=mandatory, admin=optional
    const isStaff = session.user.roleType === 'staff';
    const entityFilter = isStaff ? getEntityFilter(session) : null;
    const finalEntityId = entityIdParam || entityFilter;

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
      ticket_stats AS (
        SELECT
          t.service_id,
          COUNT(*) as ticket_count,
          COUNT(*) FILTER (WHERE t.resolved_at IS NOT NULL) as resolved_count,
          ROUND(
            (COUNT(*) FILTER (WHERE t.resolved_at IS NOT NULL)::numeric /
             NULLIF(COUNT(*)::numeric, 0) * 100),
            2
          ) as resolution_rate
        FROM tickets t
        WHERE t.service_id IS NOT NULL
        ${conditions.length > 0 ? 'AND ' + conditions.map(c => c.replace('s.entity_id', 't.assigned_entity_id')).join(' AND ') : ''}
        GROUP BY t.service_id
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
        COALESCE(ts.ticket_count, 0) as ticket_count,
        COALESCE(ts.resolved_count, 0) as resolved_count,
        COALESCE(ts.resolution_rate, 0) as resolution_rate,
        -- Grievance rate for display
        ROUND(
          COALESCE(sf.grievance_count::numeric / NULLIF(sf.feedback_count::numeric, 0) * 100, 0),
          2
        ) as grievance_rate,
        -- Calculate overall score (weighted average) - Scale: 0-10
        -- Formula: (satisfaction/5 × W1) + (ticket_resolution/100 × W2) + ((1 - grievance_rate) × W3)
        -- Where W1, W2, W3 are configurable weights (default: 4.0, 2.5, 3.5)
        ROUND(
          (
            (COALESCE(sf.avg_satisfaction, 0) / 5) * ${satWeight} +
            (COALESCE(ts.resolution_rate, 0) / 100) * ${ticketWeight} +
            (1 - COALESCE(sf.grievance_count::numeric / NULLIF(sf.feedback_count::numeric, 0), 0)) * ${grievWeight}
          )::numeric,
          2
        ) as overall_score
      FROM service_feedback_stats sf
      LEFT JOIN ticket_stats ts ON sf.service_id = ts.service_id
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
      weights: {
        satisfaction: satWeight * 10,
        ticket_resolution: ticketWeight * 10,
        grievance: grievWeight * 10,
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
