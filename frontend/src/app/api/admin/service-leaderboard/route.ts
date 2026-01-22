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

    // Query 5: Dimension rankings - Top and Bottom for each rating dimension
    // Using the same base CTE with min 2 feedback requirement
    const dimensionRankingsQuery = `
      WITH service_with_scores AS (
        SELECT
          s.service_id,
          s.service_name,
          e.entity_name,
          e.unique_entity_id as entity_id,
          COUNT(DISTINCT f.feedback_id) as feedback_count,
          ROUND(AVG(f.q1_ease)::numeric, 2) as avg_ease,
          ROUND(AVG(f.q2_clarity)::numeric, 2) as avg_clarity,
          ROUND(AVG(f.q3_timeliness)::numeric, 2) as avg_timeliness,
          ROUND(AVG(f.q4_trust)::numeric, 2) as avg_trust,
          ROUND(AVG(f.q5_overall_satisfaction)::numeric, 2) as avg_satisfaction,
          COUNT(CASE WHEN f.grievance_flag = TRUE THEN 1 END) as grievance_count,
          COALESCE(ts.ticket_count, 0) as ticket_count,
          COALESCE(ts.resolved_count, 0) as resolved_count,
          COALESCE(ts.resolution_rate, 0) as resolution_rate,
          ROUND(
            COALESCE(COUNT(CASE WHEN f.grievance_flag = TRUE THEN 1 END)::numeric / NULLIF(COUNT(DISTINCT f.feedback_id)::numeric, 0) * 100, 0),
            2
          ) as grievance_rate,
          ROUND(
            (
              (COALESCE(AVG(f.q5_overall_satisfaction), 0) / 5) * ${satWeight} +
              (COALESCE(ts.resolution_rate, 0) / 100) * ${ticketWeight} +
              (1 - COALESCE(COUNT(CASE WHEN f.grievance_flag = TRUE THEN 1 END)::numeric / NULLIF(COUNT(DISTINCT f.feedback_id)::numeric, 0), 0)) * ${grievWeight}
            )::numeric,
            2
          ) as overall_score
        FROM service_master s
        JOIN entity_master e ON s.entity_id = e.unique_entity_id
        LEFT JOIN service_feedback f ON s.service_id = f.service_id
        LEFT JOIN (
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
        ) ts ON s.service_id = ts.service_id
        ${whereClause}
        GROUP BY s.service_id, s.service_name, e.entity_name, e.unique_entity_id, ts.ticket_count, ts.resolved_count, ts.resolution_rate
        HAVING COUNT(DISTINCT f.feedback_id) >= 2
      ),
      -- Top for each dimension (DESC ordering)
      top_ease AS (SELECT * FROM service_with_scores ORDER BY avg_ease DESC, overall_score DESC, feedback_count DESC, grievance_count ASC LIMIT 1),
      top_clarity AS (SELECT * FROM service_with_scores ORDER BY avg_clarity DESC, overall_score DESC, feedback_count DESC, grievance_count ASC LIMIT 1),
      top_timeliness AS (SELECT * FROM service_with_scores ORDER BY avg_timeliness DESC, overall_score DESC, feedback_count DESC, grievance_count ASC LIMIT 1),
      top_trust AS (SELECT * FROM service_with_scores ORDER BY avg_trust DESC, overall_score DESC, feedback_count DESC, grievance_count ASC LIMIT 1),
      top_satisfaction AS (SELECT * FROM service_with_scores ORDER BY avg_satisfaction DESC, overall_score DESC, feedback_count DESC, grievance_count ASC LIMIT 1),
      -- Bottom for each dimension (ASC ordering with reversed tiebreakers)
      bottom_ease AS (SELECT * FROM service_with_scores ORDER BY avg_ease ASC, overall_score ASC, feedback_count ASC, grievance_count DESC LIMIT 1),
      bottom_clarity AS (SELECT * FROM service_with_scores ORDER BY avg_clarity ASC, overall_score ASC, feedback_count ASC, grievance_count DESC LIMIT 1),
      bottom_timeliness AS (SELECT * FROM service_with_scores ORDER BY avg_timeliness ASC, overall_score ASC, feedback_count ASC, grievance_count DESC LIMIT 1),
      bottom_trust AS (SELECT * FROM service_with_scores ORDER BY avg_trust ASC, overall_score ASC, feedback_count ASC, grievance_count DESC LIMIT 1),
      bottom_satisfaction AS (SELECT * FROM service_with_scores ORDER BY avg_satisfaction ASC, overall_score ASC, feedback_count ASC, grievance_count DESC LIMIT 1)
      SELECT
        'ease_of_access' as dimension, 'top' as rank_type, te.* FROM top_ease te
      UNION ALL SELECT 'ease_of_access', 'bottom', be.* FROM bottom_ease be
      UNION ALL SELECT 'clear_info', 'top', tc.* FROM top_clarity tc
      UNION ALL SELECT 'clear_info', 'bottom', bc.* FROM bottom_clarity bc
      UNION ALL SELECT 'timeliness', 'top', tt.* FROM top_timeliness tt
      UNION ALL SELECT 'timeliness', 'bottom', bt.* FROM bottom_timeliness bt
      UNION ALL SELECT 'service_trust', 'top', ttr.* FROM top_trust ttr
      UNION ALL SELECT 'service_trust', 'bottom', btr.* FROM bottom_trust btr
      UNION ALL SELECT 'satisfaction', 'top', ts.* FROM top_satisfaction ts
      UNION ALL SELECT 'satisfaction', 'bottom', bs.* FROM bottom_satisfaction bs
    `;

    const dimensionRankingsResult = await pool.query(dimensionRankingsQuery, params);

    // Transform dimension rankings into structured object
    const dimensionRankings: Record<string, { top: any; bottom: any }> = {
      ease_of_access: { top: null, bottom: null },
      clear_info: { top: null, bottom: null },
      timeliness: { top: null, bottom: null },
      service_trust: { top: null, bottom: null },
      satisfaction: { top: null, bottom: null }
    };

    for (const row of dimensionRankingsResult.rows) {
      const { dimension, rank_type, ...serviceData } = row;
      if (dimensionRankings[dimension]) {
        dimensionRankings[dimension][rank_type as 'top' | 'bottom'] = serviceData;
      }
    }

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
      dimension_rankings: dimensionRankings,
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
